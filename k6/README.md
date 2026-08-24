# Reportador de rendimiento · k6

Plantilla de informe de pruebas de rendimiento. Produce tres artefactos desde una
sola fuente:

| Artefacto | Para qué |
|---|---|
| `metricas.json` | La fuente única. Todo lo demás se dibuja desde acá |
| `informe.html` | El documento de análisis, autocontenido y sin dependencias externas |
| `allure-results/` | El dictamen, un caso por acuerdo de servicio, en la capa `performance` |

La plantilla **nunca lee de k6**. Lee de `metricas.json`, con una forma propia.
En el medio hay un adaptador que traduce la salida de k6 a esa forma. El día que
cambies k6 por otra herramienta, escribís otro adaptador y el informe sigue igual.

---

## Estructura

```
k6/
├── config/
│   ├── entorno.js       URL del SUT, ambiente, responsable — todo por variables
│   ├── perfiles.js      smoke · carga · estres · pico · resistencia
│   └── umbrales.js      los acuerdos de servicio declarados
├── lib/cliente.js       cliente HTTP con tags y códigos esperados por endpoint
├── escenarios/          el recorrido funcional que se somete a carga
├── adaptador/
│   ├── resumen.js       handleSummary → resumen.json (agregados + dictamen)
│   ├── adaptar.mjs      crudo.json → metricas.json (series por segundo)
│   └── puente-allure.mjs  metricas.json → allure-results
├── informe/
│   ├── graficos.mjs     gráficos en SVG, sin librerías
│   └── informe.mjs      metricas.json → informe.html
├── demo/                una corrida de ejemplo, para regenerar el informe sin correr nada
└── sut-demo/            un servidor que se degrada bajo carga, para probar la plantilla
```

---

## Cómo se usa

```bash
npm run perf:estres      # o perf:smoke · perf:carga · perf:pico · perf:resistencia
npm run perf:publicar    # adapta, dibuja el informe y escribe el puente a Allure
```

`perf:publicar` encadena tres pasos que también se pueden correr sueltos:

```bash
npm run perf:adaptar     # crudo.json → metricas.json  (y borra el crudo)
npm run perf:informe     # metricas.json → informe.html
npm run perf:allure      # metricas.json → allure-results/
```

Para ver la plantilla sin correr una prueba, con la corrida de ejemplo:

```bash
cp k6/demo/metricas-estres.json artefactos/k6/metricas.json
npm run perf:informe
```

---

## Conectar el sistema real

Todo el acople vive en dos archivos.

**`k6/config/entorno.js`** — se alimenta de variables, así que basta pasarlas:

```bash
k6 run -e SUT_BASE_URL=https://api.cliente.com \
       -e ENV_NAME=staging \
       -e CODIGO_FUNCIONAL=PERF-07 \
       -e TIPO_PRUEBA=carga \
       --out json=artefactos/k6/crudo.json k6/escenarios/recorrido.js
```

**`k6/lib/cliente.js`** — la lista de endpoints y, por cada uno, **qué códigos son
esperados**:

```js
const respuestasEsperadas = {
  login: [200],
  pedido: [201],
  inexistente: [404],
};
```

Eso último no es un detalle. Un endpoint negativo que devuelve 404 correctamente
**no es un error del sistema**: es una prueba que pasó. Declararlo acá hace que
`http_req_failed` no lo cuente y que la tasa de error del informe sea verdad. Sin
esa declaración, un puñado de casos negativos te infla la tasa de error, tapa los
errores reales y te da un dictamen falso.

Después, los acuerdos de servicio en **`k6/config/umbrales.js`**, que son los que
producen el dictamen.

---

## Qué muestra el informe

**El dictamen primero.** Cada acuerdo declarado contra lo observado, con el desvío.
`APROBADO` si se cumplen todos, `NO APROBADO` si falla alguno de severidad
`blocker` o `critical`, `APROBADO CON OBSERVACIONES` en el resto de los casos.

**Percentiles, no promedios.** El promedio se informa por completitud y se aclara
en el texto que no es un indicador: esconde la cola de la distribución.

**Cinco gráficos, y ninguno de relleno:**

1. **Percentiles en el tiempo** — el punto donde la curva se despega de la carga
   es la saturación
2. **Usuarios virtuales** — la carga aplicada, en el mismo eje de tiempo
3. **Peticiones por segundo**, correctas y fallidas apiladas — cuando el caudal
   deja de crecer mientras la carga sube, ese es el techo del sistema
4. **Códigos de estado en el tiempo** — cuándo empezó a degradarse y con qué error
5. **Descomposición del tiempo por endpoint** — `blocked`, `connecting`, TLS,
   `sending`, `waiting`, `receiving`

El quinto es el que hace accionable el informe. Si el peso está en `waiting`, el
problema es la aplicación; si está en `connecting` o en la negociación TLS, es
infraestructura; si está en `receiving`, estás moviendo payloads grandes. Sin ese
desglose, lo único que se puede decir es "está lento".

Los gráficos son SVG generado desde los datos: **sin CDN, sin librerías**. El
informe se abre sin internet y sigue funcionando dentro de cinco años.

---

## El puente a Allure

`perf:allure` escribe un caso de Allure **por cada acuerdo de servicio**, con el
`informe.html` y el `metricas.json` como adjuntos.

```
Rendimiento · PERF-01 · SLO-01   El p95 global no supera 500 ms      passed
Rendimiento · PERF-01 · SLO-03   La tasa de fallo se mantiene < 1 %  failed
```

Todos con `layer: performance`, así conviven con las capas `e2e` y `api` en el
mismo reporte **sin mezclarse en el mismo denominador**. El `historyId` es estable
por acuerdo, de modo que el Trend de Allure muestra si cada SLO viene
cumpliéndose corrida tras corrida.

Allure lleva el veredicto; el informe propio lleva el análisis.

---

## Decisiones que conviene conocer

**Por qué hay dos salidas de k6.** `handleSummary()` entrega sólo los agregados
finales: sirve para el dictamen, pero no permite dibujar nada contra el tiempo.
Las series salen de `--out json`, que escribe un punto por medición. El adaptador
lo lee **en streaming**, lo colapsa en ventanas de un segundo y borra el crudo:
una corrida de dos minutos genera unos 34 MB de crudo y deja un `metricas.json`
de unos 260 KB.

**Por qué latencia y usuarios van en gráficos separados.** Son dos escalas
distintas, y un gráfico de doble eje deforma la relación entre las curvas según
cómo se elijan los rangos. Van uno debajo del otro compartiendo el eje de tiempo,
que se lee igual de bien y no miente.

**El límite del adaptador.** Guarda en memoria las duraciones de la corrida para
calcular percentiles exactos e histograma. Con cientos de miles de peticiones es
holgado; para millones habría que cambiar a un estimador por cuantiles.
