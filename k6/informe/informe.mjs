import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  PALETA,
  escapar,
  graficoDeAreaApilada,
  graficoDeBarras,
  graficoDeBarrasApiladas,
  graficoDeLineas,
  leyenda,
  numeroCorto,
} from "./graficos.mjs";

const DIRECTORIO = process.env.SALIDA_DIR || "artefactos/k6";
const ORIGEN = `${DIRECTORIO}/metricas.json`;
const DESTINO = `${DIRECTORIO}/informe.html`;

const NOMBRE_DE_FASE = {
  blocked: "Espera de conexion libre",
  connecting: "Establecimiento TCP",
  tls_handshaking: "Negociacion TLS",
  sending: "Envio de la peticion",
  waiting: "Procesamiento del servidor",
  receiving: "Recepcion de la respuesta",
};

const TIPO_DE_PRUEBA = {
  smoke: "Verificacion minima del escenario",
  carga: "Comportamiento bajo la carga esperada",
  estres: "Comportamiento por encima de la carga esperada",
  pico: "Respuesta ante un pico subito y su recuperacion",
  resistencia: "Degradacion sostenida en el tiempo",
};

const COLOR_DE_DICTAMEN = {
  APROBADO: "good",
  "APROBADO CON OBSERVACIONES": "warning",
  "NO APROBADO": "critical",
};

const duracionLegible = (ms) => {
  const total = Math.round(ms / 1000);
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return minutos ? `${minutos} min ${segundos} s` : `${segundos} s`;
};

const bytesLegible = (bytes) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const fecha = (iso) => (iso ? new Date(iso).toISOString().replace("T", " ").slice(0, 19) : "-");

const tarjeta = (etiqueta, valor, sufijo = "", estado = "") =>
  `<div class="tarjeta ${estado}"><span class="etiqueta">${escapar(etiqueta)}</span><span class="valor">${escapar(valor)}<span class="sufijo">${escapar(sufijo)}</span></span></div>`;

const filaDeUmbral = (umbral) => {
  const estado = umbral.cumple === null ? "sin-dato" : umbral.cumple ? "good" : "critical";
  const icono = umbral.cumple === null ? "—" : umbral.cumple ? "✔" : "✘";
  const veredicto = umbral.cumple === null ? "sin dato" : umbral.cumple ? "cumple" : "no cumple";
  const desvio =
    umbral.desviacionPct === null
      ? "-"
      : `${umbral.desviacionPct > 0 ? "+" : ""}${umbral.desviacionPct} %`;
  const observado =
    umbral.observado === null
      ? "-"
      : umbral.unidad === "ratio"
        ? `${(umbral.observado * 100).toFixed(2)} %`
        : `${numeroCorto(umbral.observado)} ${umbral.unidad}`;
  const limite = umbral.unidad === "ratio" ? `${(umbral.limite * 100).toFixed(2)} %` : `${umbral.limite} ${umbral.unidad}`;
  return `<tr class="${estado}">
    <td class="mono">${escapar(umbral.id)}</td>
    <td>${escapar(umbral.descripcion)}</td>
    <td class="mono">${escapar(umbral.expresion)}</td>
    <td class="num">${escapar(limite)}</td>
    <td class="num fuerte">${escapar(observado)}</td>
    <td class="num">${escapar(desvio)}</td>
    <td class="estado"><span class="pastilla ${estado}">${icono} ${veredicto}</span></td>
  </tr>`;
};

const construir = (m) => {
  const series = m.series;
  const seriesPercentiles = [
    { nombre: "p50", valores: series.p50 },
    { nombre: "p90", valores: series.p90 },
    { nombre: "p95", valores: series.p95 },
    { nombre: "p99", valores: series.p99 },
  ];

  const exitosasPorSegundo = series.rps.map((total, i) => total - series.errores[i]);
  const seriesCarga = [
    { nombre: "Peticiones correctas", valores: exitosasPorSegundo, color: PALETA.estado.good },
    { nombre: "Peticiones fallidas", valores: series.errores, color: PALETA.estado.critical },
  ];

  const clasesPresentes = ["2xx", "3xx", "4xx", "5xx"].filter((clase) =>
    series.status[clase].some((valor) => valor > 0),
  );
  const colorDeClase = { "2xx": PALETA.estado.good, "3xx": PALETA.estado.warning, "4xx": PALETA.estado.serious, "5xx": PALETA.estado.critical };
  const seriesStatus = clasesPresentes.map((clase) => ({
    nombre: clase,
    valores: series.status[clase],
    color: colorDeClase[clase],
  }));

  const fasesUsadas = Object.keys(NOMBRE_DE_FASE).filter((fase) =>
    m.endpoints.some((endpoint) => (endpoint.fases[fase] ?? 0) > 0.02),
  );
  const seriesFases = fasesUsadas.map((fase, indice) => ({
    clave: fase,
    nombre: NOMBRE_DE_FASE[fase],
    color: PALETA.serie[indice],
  }));

  const etiquetasHistograma = m.histograma.bordes
    .slice(0, -1)
    .map((borde, i) => `${numeroCorto(borde)}-${numeroCorto(m.histograma.bordes[i + 1])}`);

  const dictamen = m.dictamen.resultado;
  const incumplidos = m.dictamen.umbrales.filter((u) => u.cumple === false);

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe de prueba de rendimiento · ${escapar(m.identificacion.codigoFuncional)}</title>
<style>
  :root {
    color-scheme: light;
    --plano: #f9f9f7; --superficie: #fcfcfb;
    --tinta: #0b0b0b; --tinta-2: #52514e; --tinta-3: #898781;
    --rejilla: #e1e0d9; --base: #c3c2b7; --borde: rgba(11,11,11,0.10);
    --good: #0ca30c; --warning: #fab219; --serious: #ec835a; --critical: #d03b3b;
    --serie-1: ${PALETA.ordinal[0]}; --serie-2: ${PALETA.ordinal[1]};
    --serie-3: ${PALETA.ordinal[2]}; --serie-4: ${PALETA.ordinal[3]};
    --secuencial: ${PALETA.secuencial};
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      color-scheme: dark;
      --plano: #0d0d0d; --superficie: #1a1a19;
      --tinta: #ffffff; --tinta-2: #c3c2b7; --tinta-3: #898781;
      --rejilla: #2c2c2a; --base: #383835; --borde: rgba(255,255,255,0.10);
      --serie-1: ${PALETA.ordinalOscura[0]}; --serie-2: ${PALETA.ordinalOscura[1]};
      --serie-3: ${PALETA.ordinalOscura[2]}; --serie-4: ${PALETA.ordinalOscura[3]};
      --secuencial: #3987e5;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --plano: #0d0d0d; --superficie: #1a1a19;
    --tinta: #ffffff; --tinta-2: #c3c2b7; --tinta-3: #898781;
    --rejilla: #2c2c2a; --base: #383835; --borde: rgba(255,255,255,0.10);
    --serie-1: ${PALETA.ordinalOscura[0]}; --serie-2: ${PALETA.ordinalOscura[1]};
    --serie-3: ${PALETA.ordinalOscura[2]}; --serie-4: ${PALETA.ordinalOscura[3]};
    --secuencial: #3987e5;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--plano); color: var(--tinta);
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.5; }
  .hoja { max-width: 1040px; margin: 0 auto; padding: 28px 24px 60px; }
  header.principal { border-bottom: 3px solid var(--serie-2); padding-bottom: 18px; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.01em; }
  .subtitulo { color: var(--tinta-2); margin: 0; }
  .identificacion { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px 24px; margin-top: 18px; }
  .campo .clave { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: var(--tinta-3); }
  .campo .dato { font-weight: 600; }
  section { margin-top: 34px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .09em; color: var(--tinta-2);
       margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--borde); font-weight: 700; }
  h3 { font-size: 14px; margin: 0 0 2px; font-weight: 600; }
  .nota { color: var(--tinta-3); font-size: 12px; margin: 0 0 10px; }
  .dictamen { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 8px;
              background: var(--superficie); border: 1px solid var(--borde); border-left: 5px solid var(--tinta-3); }
  .dictamen.good { border-left-color: var(--good); }
  .dictamen.warning { border-left-color: var(--warning); }
  .dictamen.critical { border-left-color: var(--critical); }
  .dictamen .marca { font-size: 26px; line-height: 1; }
  .dictamen .texto strong { font-size: 18px; display: block; }
  .dictamen .texto span { color: var(--tinta-2); }
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .tarjeta { background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; padding: 12px 14px; }
  .tarjeta .etiqueta { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--tinta-3); margin-bottom: 4px; }
  .tarjeta .valor { font-size: 24px; font-weight: 700; }
  .tarjeta .sufijo { font-size: 12px; font-weight: 500; color: var(--tinta-2); margin-left: 3px; }
  .tarjeta.good .valor { color: var(--good); }
  .tarjeta.critical .valor { color: var(--critical); }
  .tarjeta.warning .valor { color: var(--serious); }
  .grafico { background: var(--superficie); border: 1px solid var(--borde); border-radius: 8px; padding: 14px 16px; margin-top: 14px; }
  .grafico svg { width: 100%; height: auto; display: block; }
  .rejilla { stroke: var(--rejilla); stroke-width: 1; }
  .base { stroke: var(--base); stroke-width: 1; }
  .linea { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .capa { stroke: var(--superficie); stroke-width: 2; }
  .barra, .segmento { stroke: var(--superficie); stroke-width: 1; }
  .tick { fill: var(--tinta-3); font-size: 10px; font-variant-numeric: tabular-nums; }
  .rotulo { fill: var(--tinta-3); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
  .etiqueta { fill: var(--tinta-2); font-size: 11px; }
  .valor { fill: var(--tinta-2); font-size: 11px; font-variant-numeric: tabular-nums; }
  .zona { fill: transparent; }
  .leyenda { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; font-size: 12px; color: var(--tinta-2); }
  .leyenda .item { display: inline-flex; align-items: center; gap: 6px; }
  .leyenda .muestra { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; background: var(--superficie);
          border: 1px solid var(--borde); border-radius: 8px; overflow: hidden; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--borde); font-size: 13px; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--tinta-3); font-weight: 700; }
  tr:last-child td { border-bottom: none; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  td.fuerte { font-weight: 700; }
  .pastilla { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .pastilla.good { background: rgba(12,163,12,.14); color: var(--good); }
  .pastilla.critical { background: rgba(208,59,59,.14); color: var(--critical); }
  .pastilla.warning { background: rgba(236,131,90,.16); color: var(--serious); }
  .pastilla.sin-dato { background: rgba(137,135,129,.16); color: var(--tinta-3); }
  .metodo { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 700; color: var(--tinta-2); }
  footer { margin-top: 44px; padding-top: 16px; border-top: 1px solid var(--borde); color: var(--tinta-3); font-size: 12px; }
  #globo { position: fixed; pointer-events: none; opacity: 0; transition: opacity .1s;
           background: var(--tinta); color: var(--plano); padding: 5px 9px; border-radius: 5px;
           font-size: 12px; max-width: 340px; z-index: 9; }
  @media print { body { background: #fff; } .grafico, table, .tarjeta, .dictamen { break-inside: avoid; } }
</style></head>
<body>
<div class="hoja">

<header class="principal">
  <h1>Informe de prueba de rendimiento</h1>
  <p class="subtitulo">${escapar(m.identificacion.proyecto)} · ${escapar(m.identificacion.codigoFuncional)} · ${escapar(TIPO_DE_PRUEBA[m.identificacion.tipoDePrueba] ?? m.identificacion.tipoDePrueba)}</p>
  <div class="identificacion">
    <div class="campo"><span class="clave">Tipo de prueba</span><span class="dato">${escapar(m.identificacion.tipoDePrueba)}</span></div>
    <div class="campo"><span class="clave">Ambiente</span><span class="dato">${escapar(m.identificacion.ambiente)}</span></div>
    <div class="campo"><span class="clave">Sistema bajo prueba</span><span class="dato">${escapar(m.identificacion.sut)}</span></div>
    <div class="campo"><span class="clave">Herramienta</span><span class="dato">${escapar(m.identificacion.herramienta)}</span></div>
    <div class="campo"><span class="clave">Responsable</span><span class="dato">${escapar(m.identificacion.responsable)}</span></div>
    <div class="campo"><span class="clave">Inicio</span><span class="dato">${escapar(fecha(m.identificacion.inicio))}</span></div>
    <div class="campo"><span class="clave">Duracion</span><span class="dato">${escapar(duracionLegible(m.identificacion.duracionMs))}</span></div>
    <div class="campo"><span class="clave">Perfil de carga</span><span class="dato">${escapar(m.perfil.descripcion)}</span></div>
  </div>
</header>

<section>
  <h2>Dictamen</h2>
  <div class="dictamen ${COLOR_DE_DICTAMEN[dictamen] ?? ""}">
    <span class="marca">${dictamen === "APROBADO" ? "✔" : dictamen === "NO APROBADO" ? "✘" : "!"}</span>
    <span class="texto">
      <strong>${escapar(dictamen)}</strong>
      <span>${incumplidos.length} de ${m.dictamen.umbrales.length} acuerdos de servicio incumplidos${incumplidos.length ? ` · ${incumplidos.map((u) => u.id).join(", ")}` : ""}</span>
    </span>
  </div>
  <table style="margin-top:14px">
    <thead><tr><th>ID</th><th>Acuerdo de servicio declarado</th><th>Expresion</th><th class="num">Limite</th><th class="num">Observado</th><th class="num">Desvio</th><th>Resultado</th></tr></thead>
    <tbody>${m.dictamen.umbrales.map(filaDeUmbral).join("")}</tbody>
  </table>
  <p class="nota">Los acuerdos se declaran antes de ejecutar. Un valor verde no alcanza si algun acuerdo declarado quedo sin verificar.</p>
</section>

<section>
  <h2>Indicadores de la corrida</h2>
  <div class="tarjetas">
    ${tarjeta("Peticiones", numeroCorto(m.resumen.peticiones))}
    ${tarjeta("Throughput", numeroCorto(m.resumen.throughputRps), "req/s")}
    ${tarjeta("Tasa de error", m.resumen.tasaErrorPct.toFixed(2), "%", m.resumen.tasaErrorPct > 1 ? "critical" : "good")}
    ${tarjeta("Latencia p95", numeroCorto(m.latencia.p95), "ms")}
    ${tarjeta("Latencia p99", numeroCorto(m.latencia.p99), "ms")}
    ${tarjeta("Usuarios maximos", String(m.resumen.vusMax))}
  </div>
  <p class="nota">El promedio (${numeroCorto(m.latencia.avg)} ms) se informa por completitud, no como indicador: esconde la cola de la distribucion. La lectura correcta son los percentiles.</p>
</section>

<section>
  <h2>Evolucion de la latencia</h2>
  <div class="grafico">
    <h3>Percentiles del tiempo de respuesta</h3>
    <p class="nota">El punto en que la curva se despega de la carga aplicada marca la saturacion del sistema.</p>
    ${graficoDeLineas({ t: series.t, series: seriesPercentiles, unidad: "ms", tituloEjeY: "ms" })}
    ${leyenda(seriesPercentiles.map((s, i) => ({ nombre: s.nombre, color: PALETA.ordinal[i] })))}
  </div>
  <div class="grafico">
    <h3>Usuarios virtuales activos</h3>
    <p class="nota">Carga aplicada segundo a segundo, en el mismo eje de tiempo que el grafico anterior.</p>
    ${graficoDeAreaApilada({ t: series.t, series: [{ nombre: "Usuarios virtuales", valores: series.vus, color: PALETA.secuencial }], unidad: "VU", tituloEjeY: "VU" })}
  </div>
</section>

<section>
  <h2>Caudal y errores</h2>
  <div class="grafico">
    <h3>Peticiones por segundo</h3>
    <p class="nota">Cuando el caudal deja de crecer mientras la carga sigue subiendo, el sistema alcanzo su techo.</p>
    ${graficoDeAreaApilada({ t: series.t, series: seriesCarga, unidad: "req/s", tituloEjeY: "req/s" })}
    ${leyenda(seriesCarga.map((s) => ({ nombre: s.nombre, color: s.color })))}
  </div>
  <div class="grafico">
    <h3>Status code en el tiempo</h3>
    <p class="nota">Los codigos declarados como esperados por endpoint no cuentan como error en la tasa de fallo.</p>
    ${graficoDeAreaApilada({ t: series.t, series: seriesStatus, unidad: "resp/s", tituloEjeY: "resp/s" })}
    ${leyenda(seriesStatus.map((s) => ({ nombre: s.nombre, color: s.color })))}
  </div>
</section>

<section>
  <h2>Distribucion del tiempo de respuesta</h2>
  <div class="grafico">
    <h3>Frecuencia por intervalo (ms)</h3>
    <p class="nota">Un percentil 95 correcto con una cola larga sigue siendo un problema: la cola se ve aca.</p>
    ${graficoDeBarras({ etiquetas: etiquetasHistograma, valores: m.histograma.frecuencias, color: PALETA.secuencial, unidad: "peticiones", tituloEjeY: "peticiones" })}
  </div>
  <table style="margin-top:14px">
    <thead><tr><th>Estadistico</th><th class="num">Global (ms)</th></tr></thead>
    <tbody>
      ${["min", "avg", "p50", "p90", "p95", "p99", "max"].map((clave) => `<tr><td class="mono">${clave}</td><td class="num fuerte">${numeroCorto(m.latencia[clave])}</td></tr>`).join("")}
    </tbody>
  </table>
</section>

<section>
  <h2>Descomposicion del tiempo por endpoint</h2>
  <p class="nota">Separa el tiempo de red del tiempo de servidor. Si el peso esta en el procesamiento, el problema es la aplicacion; si esta en la conexion o la negociacion TLS, es infraestructura.</p>
  <div class="grafico">
    ${graficoDeBarrasApiladas({
      filas: m.endpoints.map((endpoint) => ({ nombre: endpoint.nombre, valores: endpoint.fases })),
      series: seriesFases,
      unidad: "ms",
    })}
    ${leyenda(seriesFases.map((s) => ({ nombre: s.nombre, color: s.color })))}
  </div>
</section>

<section>
  <h2>Detalle por endpoint</h2>
  <table>
    <thead><tr><th>Metodo</th><th>Endpoint</th><th class="num">Peticiones</th><th class="num">Fallidas</th><th class="num">Error</th><th class="num">p50</th><th class="num">p95</th><th class="num">p99</th><th class="num">Max</th><th>Status code</th></tr></thead>
    <tbody>
      ${m.endpoints
        .map(
          (endpoint) => `<tr>
        <td class="metodo">${escapar(endpoint.metodo)}</td>
        <td>${escapar(endpoint.nombre)}</td>
        <td class="num">${numeroCorto(endpoint.peticiones)}</td>
        <td class="num">${numeroCorto(endpoint.fallidas)}</td>
        <td class="num"><span class="pastilla ${endpoint.tasaErrorPct > 1 ? "critical" : "good"}">${endpoint.tasaErrorPct.toFixed(2)} %</span></td>
        <td class="num">${numeroCorto(endpoint.latencia.p50)}</td>
        <td class="num fuerte">${numeroCorto(endpoint.latencia.p95)}</td>
        <td class="num">${numeroCorto(endpoint.latencia.p99)}</td>
        <td class="num">${numeroCorto(endpoint.latencia.max)}</td>
        <td class="mono">${escapar(Object.entries(endpoint.status).map(([codigo, cantidad]) => `${codigo}:${cantidad}`).join(" "))}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</section>

<section>
  <h2>Verificaciones funcionales</h2>
  <table>
    <thead><tr><th>Verificacion</th><th class="num">Correctas</th><th class="num">Fallidas</th><th class="num">Tasa</th></tr></thead>
    <tbody>
      ${m.checks
        .map(
          (check) => `<tr><td>${escapar(check.nombre)}</td><td class="num">${numeroCorto(check.ok)}</td><td class="num">${numeroCorto(check.fallidos)}</td>
          <td class="num"><span class="pastilla ${check.tasaOkPct >= 99 ? "good" : "critical"}">${check.tasaOkPct.toFixed(2)} %</span></td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
</section>

${
  m.errores.length
    ? `<section>
  <h2>Errores observados</h2>
  <table>
    <thead><tr><th>Tipo</th><th class="num">Cantidad</th><th class="num">Sobre el total</th><th>Endpoints afectados</th></tr></thead>
    <tbody>
      ${m.errores
        .map(
          (error) => `<tr><td class="mono">${escapar(error.tipo)}</td><td class="num fuerte">${numeroCorto(error.cantidad)}</td>
          <td class="num">${((error.cantidad / m.resumen.peticiones) * 100).toFixed(2)} %</td>
          <td>${escapar(error.endpoints.join(", "))}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
</section>`
    : ""
}

<section>
  <h2>Volumen transferido</h2>
  <div class="tarjetas">
    ${tarjeta("Datos enviados", bytesLegible(m.resumen.datosEnviadosBytes))}
    ${tarjeta("Datos recibidos", bytesLegible(m.resumen.datosRecibidosBytes))}
    ${tarjeta("Iteraciones", numeroCorto(m.resumen.iteraciones))}
  </div>
</section>

<footer>
  <p>Documentacion de prueba conforme a ISO/IEC/IEEE 29119-3:2021 (sucesora de IEEE 829). Tecnicas segun ISO/IEC/IEEE 29119-4. Modelo de calidad ISO/IEC 25010, caracteristica Eficiencia de desempeno.</p>
  <p>Todos los valores de este informe provienen de <code>metricas.json</code>, generado por la corrida. Ningun numero fue escrito a mano.</p>
  <p>Responsable: ${escapar(m.identificacion.responsable)} · Generado el ${escapar(fecha(m.identificacion.fin))}</p>
</footer>

</div>
<div id="globo"></div>
<script>
  (function () {
    var globo = document.getElementById("globo");
    document.addEventListener("mousemove", function (evento) {
      var objetivo = evento.target.closest("[data-info]");
      if (!objetivo) { globo.style.opacity = "0"; return; }
      globo.textContent = objetivo.getAttribute("data-info");
      globo.style.opacity = "1";
      var x = Math.min(evento.clientX + 14, window.innerWidth - globo.offsetWidth - 12);
      globo.style.left = x + "px";
      globo.style.top = (evento.clientY + 16) + "px";
    });
  })();
</script>
</body></html>`;
};

if (!existsSync(ORIGEN)) {
  console.error(`No existe ${ORIGEN}. Corre primero el adaptador.`);
  process.exit(1);
}

const metricas = JSON.parse(readFileSync(ORIGEN, "utf8"));
mkdirSync(dirname(DESTINO), { recursive: true });
writeFileSync(DESTINO, construir(metricas));
console.log(`informe.html escrito · dictamen ${metricas.dictamen.resultado}`);
