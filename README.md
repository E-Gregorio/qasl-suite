# qasl-suite

Suite de automatización de QASL. Tres capas de prueba —funcional de interfaz,
de servicios y de rendimiento— que terminan en **un solo reporte de Allure**,
sin mezclarse entre sí.

| Capa | Herramienta | Contra qué corre | Casos |
|---|---|---|---|
| `e2e` | Playwright | saucedemo.com | 10 |
| `api` | Playwright (APIRequestContext) | fakestoreapi.com — **no responde** (ver pendientes) | 7 |
| `performance` | k6 | SUT demo en `localhost:4300` | 5 acuerdos de servicio |

## Estado y pendientes (03/10/2026)

**Funciona**

- Capa `e2e` (10 casos contra saucedemo.com): pasa y publica cada resultado en
  QASL Manual Testing, proyecto `TIENDA`.
- `@TestCase` y el reporter de QASL: corriendo `npm test` con `QASL_URL` y
  `QASL_TOKEN`, los resultados llegan a la herramienta como un Run y los casos
  que fallan abren su bug.

**No funciona**

- **Capa `api` (7 casos):** `https://fakestoreapi.com` no responde. Los 7 tests
  terminan por timeout (`Timeout 15000ms exceeded`) y abren los bugs BUG-001 a
  BUG-007 en el proyecto `TIENDA`. **No son defectos del producto, son del
  ambiente.**

**Pendiente**

1. Reemplazar fakestoreapi.com por una API que responda. Decidir cuál antes de
   tocar código.
2. Probar el workflow de GitHub Actions con el runner self-hosted. Hasta ahora
   solo se probó la corrida local.
3. Cuando la capa `api` pase, verificar que los bugs BUG-001 a BUG-007 se cierren
   solos.

---

## Demo completa · comandos en orden

Requisitos, una sola vez:

```bash
npm install
npx playwright install chromium
```

k6 aparte, desde su instalador. Se verifica con `k6 version`. Si no lo tenés,
saltá al bloque **Rendimiento sin k6** más abajo.

**Terminal 1 — el sistema bajo prueba.** Queda abierta toda la demo:

```bash
npm run perf:sut
```

**Terminal 2 — la corrida completa:**

```bash
npm run clean              # borra resultados, reporte y artefactos
npm run test               # 17 casos: 10 e2e + 7 api
npm run perf:estres        # ~2 min de carga contra el SUT
npm run perf:publicar      # adapta, dibuja el informe, escribe los 5 SLO
npm run allure:generate    # junta las tres capas
npm run allure:open        # abre el reporte con los 22 casos
```

**El orden importa.** Los scripts `test*` limpian `allure-results` antes de
empezar, para que el reporte no arrastre resultados de corridas anteriores. Si
corrés el rendimiento primero, la capa `performance` se pierde. Siempre las
pruebas antes, el rendimiento después.

**Para mostrar la degradación.** Con la capacidad por defecto un equipo rápido
no llega a saturar el SUT y el dictamen sale todo verde. Achicá la capacidad
antes de levantarlo en la Terminal 1:

```bash
SUT_CAPACIDAD=6 SUT_COLA_MAXIMA=16 npm run perf:sut
```

En PowerShell:

```powershell
$env:SUT_CAPACIDAD=6
$env:SUT_COLA_MAXIMA=16
npm run perf:sut
```

Repetís `perf:estres` y `perf:publicar`. Ahora el p95 trepa, aparecen los 503
en el gráfico de status code y el dictamen pasa a NO APROBADO con los acuerdos
incumplidos en rojo.

Conviene tener las dos corridas: la verde muestra el sistema sano, la roja
muestra que el informe detecta la degradación y señala dónde.

**Sólo una capa:**

```bash
npm run test:e2e
npm run test:api
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
```

**Desde GitHub Actions**, el workflow `.github/workflows/qasl-suite.yml` corre
en cada push a `main` o a mano (botón *Run workflow*, con filtro opcional como
`@smoke`). Usa un runner self-hosted porque la herramienta está en el Docker
local; el paso a paso para registrarlo está en el propio workflow.

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

Un solo reporte, tres capas separadas por la etiqueta `layer`. Eso permite que
convivan sin caer en el mismo denominador: una prueba de rendimiento que no
cumple un acuerdo no ensucia el porcentaje de aprobación funcional.

El historial del Trend vive en `allure-history/`, fuera de `allure-report/`,
porque ese directorio se borra en cada generación. `allure:generate` lo
restaura antes y lo guarda después.

**Categorías propias** clasifican los fallos por causa en lugar de listarlos:
fallos de infraestructura, selectores rotos, contrato de API y degradación de
rendimiento.

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
| `npm run test` | e2e + api |
| `npm run test:e2e` | sólo interfaz |
| `npm run test:api` | sólo servicios |
| `npm run test:smoke` | los casos marcados `@smoke` |
| `npm run perf:sut` | levanta el SUT demo |
| `npm run perf:smoke` · `carga` · `estres` · `pico` · `resistencia` | perfiles de carga |
| `npm run perf:publicar` | adapta, dibuja el informe y escribe el puente a Allure |
| `npm run perf:demo` | lo mismo, desde la corrida de ejemplo, sin k6 |
| `npm run allure:generate` | genera el reporte restaurando el Trend |
| `npm run allure:open` | lo abre |
| `npm run clean` | borra resultados, reporte y artefactos |
| `npm run typecheck` | `tsc --noEmit` |
