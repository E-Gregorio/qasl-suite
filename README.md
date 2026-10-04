# qasl-suite

Suite de automatización de QASL. Cuatro capas de prueba —interfaz, servicios,
seguridad y rendimiento— que terminan en **un solo reporte de Allure**, sin
mezclarse entre sí.

| Capa | Herramienta | Contra qué corre | Casos |
|---|---|---|---|
| `e2e` | Playwright | saucedemo.com | 10 |
| `api` | Playwright (APIRequestContext) | dummyjson.com | 7 |
| `security` | Playwright (APIRequestContext) | saucedemo.com y dummyjson.com | 10 controles OWASP |
| `performance` | k6 | SUT demo en `localhost:4300` | 5 acuerdos de servicio |

## Estado y pendientes (04/10/2026)

**Funciona**

- Las 17 pruebas pasan: 10 `e2e` contra saucedemo.com y 7 `api` contra
  dummyjson.com (corrida local del 04/10/2026).
- `@TestCase` y el reporter de QASL: corriendo `npm test` con `QASL_URL` y
  `QASL_TOKEN`, los resultados llegan a QASL Manual Testing, proyecto `TIENDA`.
- `npm run qasl:allure` adjunta el reporte de Allure a esa corrida.
- El reporte sigue el estándar de las suites de QASL: épica, HU y escenario con
  el mismo nombre que en QASL Manual Testing, casos `TC-NN | Validar...`, la
  regla de negocio y el resultado esperado en la descripción, captura en cada
  paso clave, video de cada caso e2e a 1920×1080 y links que abren el caso y la
  historia en la herramienta.

**Pendiente**

1. Probar el workflow de GitHub Actions con el runner self-hosted. Hasta ahora
   solo se probó la corrida local.

---

## Demo completa · comandos en orden

Requisitos, una sola vez:

```bash
npm install
npx playwright install chromium
```

k6 aparte, desde su instalador. Se verifica con `k6 version`. Si no lo tenés,
saltá al bloque **Rendimiento sin k6** más abajo.

**Una sola terminal, la corrida completa:**

```bash
npm test                   # 27 casos: 10 e2e + 7 api + 10 controles de seguridad
npm run perf               # levanta el SUT demo, corre k6 (perfil smoke) y lo suma al reporte
npm run allure:generate    # junta las cuatro capas
npm run allure:open        # abre el reporte
```

**El orden importa.** Los scripts `test*` limpian `allure-results` antes de
empezar, para que el reporte no arrastre resultados de corridas anteriores. Si
corrés el rendimiento primero, la capa `performance` se pierde. Siempre las
pruebas antes, el rendimiento después.

**Para mostrar la degradación.** Con la capacidad por defecto un equipo rápido
no llega a saturar el SUT y el dictamen sale todo verde. Achicá la capacidad y
corré un perfil más exigente (en PowerShell):

```powershell
$env:SUT_CAPACIDAD=6
$env:SUT_COLA_MAXIMA=16
node scripts/rendimiento.mjs estres
```

El p95 trepa, aparecen los 503 en el gráfico de status code y el dictamen pasa
a NO APROBADO con los acuerdos incumplidos en rojo.

Conviene tener las dos corridas: la verde muestra el sistema sano, la roja
muestra que el informe detecta la degradación y señala dónde.

**Sólo una capa:**

```bash
npm run test:e2e
npm run test:api
npm run test:seguridad
npm run test:smoke
```

**Rendimiento sin k6 instalado.** Siembra una corrida de ejemplo versionada y
arma el informe y los casos de Allure igual:

```bash
npm run perf:demo
```

---

## Estructura

```
src/
├── core/
│   ├── allure/      el módulo de decoradores
│   ├── api/         cliente HTTP y panel de intercambio
│   ├── config/      lectura tipada de variables de entorno
│   └── fixtures/    el test extendido de Playwright
├── pages/           objetos de página
├── locators/        selectores, separados de la página
├── api/             endpoints y modelos
└── data/            datos de prueba, sin valores sueltos en el código
tests/
├── e2e/
└── api/
k6/                  el módulo de rendimiento (ver k6/README.md)
scripts/allure.mjs   limpieza de resultados e historial del Trend
```

Cuatro reglas que sostienen la suite:

1. **Nada hardcodeado.** Credenciales, URLs, mensajes esperados y códigos de
   estado viven en `src/data/` o en variables de entorno.
2. **Selectores separados de las páginas.** Cuando cambia el DOM se toca un
   archivo de `src/locators/`, no la lógica.
3. **Sin comentarios en el código.** La única excepción es `src/core/allure/`,
   que es un módulo portable y lleva su documentación.
4. **El reporte no miente.** Nada se declara en Allure que no haya ocurrido de
   verdad en la corrida.

---

## El módulo de decoradores

`src/core/allure/` es autónomo: se copia a cualquier proyecto de Playwright y
funciona. Declara el caso y sus metadatos sobre la clase, y el runner lo
registra.

```ts
@TestSuite("Compra")
@Epic("Tienda online")
@Feature("Compra")
@Owner("elyer.maldonado")
class CompraCompleta {
  @Test("el usuario completa la compra de dos productos")
  @Severity(SEVERITY.CRITICAL)
  @Story("Compra completa")
  @Tag("@smoke")
  async comprar({ loginPage, inventoryPage, cartPage }: Fixtures) {
    ...
  }
}
```

Detalles de implementación que conviene conocer:

- **Playwright usa decoradores estándar** (propuesta 2023-05) e ignora
  `experimentalDecorators` del `tsconfig`. El módulo está escrito para ese
  estándar, no para los decoradores legacy.
- **`@TestSuite` difiere el registro** con `context.addInitializer`, porque los
  decoradores de clase se aplican de abajo hacia arriba y de otro modo no
  vería a los que están por encima.
- **La firma del método se reconstruye** en tiempo de ejecución para que
  Playwright pueda inyectar los fixtures, que exige desestructuración literal
  en el primer parámetro.

---

## Trazabilidad con QASL Manual Testing

Cada caso automatizado está atado a su caso en QASL Manual Testing con la
referencia de NEXUS Requirements (`HU|TS|TC`):

```ts
@TestCase("HU-001|TS-01|TC-01")
@Test("el usuario estandar accede al catalogo")
async accesoConcedido(...) { ... }

// Con @Cases, una referencia por dato y en el mismo orden
@TestCase("HU-002|TS-02|TC-02", "HU-002|TS-02|TC-03", "HU-002|TS-02|TC-04")
@Cases(formulariosIncompletos, ...)
```

`@TestCase` hace dos cosas:

- **En Allure** agrega el link `QASL · HU-001 | TS-01 | TC-01`, que abre el
  caso en la herramienta.
- **En el pipeline** el reporter de QASL (`src/core/qasl/qasl-reporter.ts`)
  publica el resultado en ese caso: verde o rojo, y si falla abre el bug con su
  trazabilidad completa (`BUG-001 · EP-001 | HU-001 | TS-02 | TC-03`) y la
  evidencia. Cuando el caso vuelve a pasar, el bug se cierra solo.

El reporter se activa solo si existen `QASL_URL` y `QASL_TOKEN`. Sin ellas la
suite corre igual que siempre.

| Capa | Historia en QASL |
|---|---|
| Login (e2e) | HU-001 · 6 casos |
| Compra (e2e) | HU-002 · 4 casos |
| API de productos | HU-003 · 4 casos |
| API de carritos | HU-004 · 3 casos |

Las cuatro HU pertenecen a la épica EP-001 *Tienda online* del proyecto
`TIENDA` de QASL Manual Testing.

**Desde tu terminal**, con QASL Manual Testing levantado:

```powershell
$env:QASL_URL="http://localhost:4100"
$env:QASL_TOKEN="qasl-demo-token"
npm test
npm run allure:generate
npm run qasl:allure
```

`npm run qasl:allure` adjunta el reporte de Allure a la corrida que acaba de
publicarse; en QASL Manual Testing aparece el botón **Abrir reporte Allure** en
Runs. Las variables valen solo para esa ventana de PowerShell.

**Desde GitHub Actions**, el workflow `.github/workflows/qasl-suite.yml` corre
solo a mano: botón *Run workflow*, con filtro opcional como `@smoke`. Un push
no lo dispara. Usa un runner self-hosted, porque QASL Manual Testing está en el
Docker local (`http://localhost:4100`) y los runners de GitHub en la nube no
llegan a ese localhost. No se dispara con pull requests, así nadie puede
ejecutar código en la PC del runner.

Requisitos, una sola vez:

1. Runner registrado: *Settings → Actions → Runners → New self-hosted runner*.
2. Secret `QASL_TOKEN`: *Settings → Secrets and variables → Actions* (en la
   demo, `qasl-demo-token`).
3. QASL Manual Testing levantado (`docker compose up -d`) con el proyecto
   `TIENDA` cargado (`docker compose exec api npm run seed`).
4. Java instalado, para generar el reporte de Allure.

---

## El panel HTTP

Cada llamada de API adjunta al caso un panel autocontenido con lo que un
desarrollador necesita para reproducir el problema sin preguntar nada:

- método, URL, código de estado y tiempo
- cuerpo de la respuesta
- cuerpo del pedido
- cabeceras de respuesta y de pedido, plegadas y con su cantidad

Las cabeceras sensibles se enmascaran. Además se adjunta un archivo `.http`
listo para reejecutar la llamada.

---

## El reporte

Un solo reporte, cuatro capas separadas por la etiqueta `layer`. Eso permite que
convivan sin caer en el mismo denominador: una prueba de rendimiento que no
cumple un acuerdo no ensucia el porcentaje de aprobación funcional.

El historial del Trend vive en `allure-history/`, fuera de `allure-report/`,
porque ese directorio se borra en cada generación. `allure:generate` lo
restaura antes y lo guarda después.

**Categorías propias** clasifican los fallos por causa en lugar de listarlos:
fallos de infraestructura, selectores rotos, contrato de API, hallazgos de
seguridad y degradación de rendimiento.

**Evidencia por caso.** Cada paso clave de la interfaz adjunta su captura, el
caso e2e completo queda en video (`VIDEO`, `PANTALLA_ANCHO`, `PANTALLA_ALTO`
en `.env`), los montos se adjuntan como tabla esperado contra obtenido y cada
llamada de API como panel HTTP.

**Links.** Cada caso con `@TestCase` trae dos links a QASL Manual Testing: el
caso y su historia. Un `@Issue("BUG-001")` abre ese bug en la herramienta.

**El BUG nace de Allure.** Cuando un caso con `@TestCase` falla, QASL Manual
Testing crea el BUG (o lo actualiza, o lo reabre como regresión si el pipeline
lo había cerrado). El caso en Allure recibe el link a ese BUG y
`npm run qasl:allure`, además de subir el reporte, arma el **Reporte de
Defecto** de 10 secciones (identificación, descripción, precondiciones, pasos,
esperado contra obtenido, evidencia, evaluación, trazabilidad, acción sugerida y
normas) con los datos reales del resultado: los pasos que corrió, la regla y el
resultado esperado, el error, las capturas y los paneles HTTP. Lo adjunta al BUG
en la herramienta y deja una copia en `artefactos/bugs/`. Prioridad y
clasificación IEEE 1044 quedan "a definir en el triage": la corrida no las
conoce.

**Seguridad.** Diez controles pasivos sobre las respuestas reales de la tienda
y de la API: redirección a HTTPS, HSTS, `nosniff`, clickjacking, CSP, CORS y
exposición de la tecnología del servidor, clasificados por OWASP Top 10 2021.
Un control que no se cumple es un hallazgo del sistema, no un error de la
prueba, y queda en la categoría **Hallazgos de seguridad**.

---

## Rendimiento

El módulo completo está documentado en [`k6/README.md`](k6/README.md). El
resumen:

- k6 produce dos salidas: los agregados por `handleSummary` y las series por
  `--out json`
- un adaptador las convierte en un `metricas.json` propio, del que se dibuja
  todo lo demás
- el informe HTML es autocontenido, con gráficos en SVG generados desde los
  datos, sin CDN ni librerías
- un puente escribe un caso de Allure por cada acuerdo de servicio, con
  `historyId` estable para que el Trend muestre si cada uno viene cumpliéndose

**Los códigos esperados se declaran por endpoint** en `k6/lib/cliente.js`. Un
endpoint negativo que devuelve 404 correctamente es una prueba que pasó, no un
error del sistema. Sin esa declaración, un puñado de casos negativos infla la
tasa de error, tapa los errores reales y produce un dictamen falso.

Para conectar el sistema real basta con pasar las variables:

```bash
k6 run -e SUT_BASE_URL=https://api.cliente.com \
       -e ENV_NAME=staging \
       -e CODIGO_FUNCIONAL=PERF-07 \
       -e TIPO_PRUEBA=carga \
       --out json=artefactos/k6/crudo.json k6/escenarios/recorrido.js
```

El SUT demo de `k6/sut-demo/` es descartable: existe sólo para probar la
plantilla y se degrada a propósito bajo carga. Su capacidad se ajusta con
`SUT_CAPACIDAD` y `SUT_COLA_MAXIMA`.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run test` | e2e + api + seguridad |
| `npm run test:e2e` | sólo interfaz |
| `npm run test:api` | sólo servicios |
| `npm run test:seguridad` | sólo los controles de seguridad |
| `npm run test:smoke` | los casos marcados `@smoke` |
| `npm run perf` | SUT demo + k6 (perfil de `PERF_PERFIL`) + informe + puente a Allure |
| `npm run perf:sut` | levanta el SUT demo |
| `npm run perf:smoke` · `carga` · `estres` · `pico` · `resistencia` | perfiles de carga |
| `npm run perf:publicar` | adapta, dibuja el informe y escribe el puente a Allure |
| `npm run perf:demo` | lo mismo, desde la corrida de ejemplo, sin k6 |
| `npm run allure:generate` | genera el reporte restaurando el Trend |
| `npm run allure:open` | lo abre |
| `npm run clean` | borra resultados, reporte y artefactos |
| `npm run typecheck` | `tsc --noEmit` |
