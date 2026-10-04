import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ANSI = /\u001b\[[0-9;]*m/g;

const SEVERIDAD = {
  blocker: "Bloqueante",
  critical: "Critica",
  normal: "Mayor",
  minor: "Menor",
  trivial: "Trivial",
};

const escapar = (texto) =>
  String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const etiqueta = (resultado, nombre) =>
  (resultado.labels ?? []).filter((l) => l.name === nombre).map((l) => l.value);

const fecha = (ms) =>
  new Date(ms).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hour12: false });

const esTecnico = (nombre) =>
  /^(Fixture |Launch browser|Create (context|page|request context)|Close context|beforeEach hook|afterEach hook|Screenshot$|Wait for|Navigate to|Fill |Click |video$)/.test(
    nombre,
  );

const ADJUNTOS_DEL_RUNNER = ["Before Hooks", "After Hooks", "screenshot", "error-context", "trace", "video"];

const pasosDeNegocio = (pasos) =>
  (pasos ?? []).filter((p) => !ADJUNTOS_DEL_RUNNER.includes(p.name) && !esTecnico(p.name));

const precondiciones = (pasos) => {
  const antes = (pasos ?? []).find((p) => p.name === "Before Hooks");
  const hooks = (antes?.steps ?? []).filter((p) => p.name === "beforeEach hook");
  return hooks.flatMap((h) => (h.steps ?? []).filter((p) => !esTecnico(p.name)).map((p) => p.name));
};

const recorrerAdjuntos = (pasos, ruta = []) =>
  (pasos ?? []).flatMap((p) => [
    ...(p.attachments ?? []).map((a) => ({ ...a, paso: [...ruta, p.name].filter((n) => !esTecnico(n)).join(" › ") })),
    ...recorrerAdjuntos(p.steps, [...ruta, p.name]),
  ]);

const leerAdjunto = (resultados, adjunto) => {
  const archivo = path.join(resultados, adjunto.source);
  return existsSync(archivo) ? readFileSync(archivo) : null;
};

const bloqueEvidencia = (resultados, adjunto) => {
  const contenido = leerAdjunto(resultados, adjunto);
  if (!contenido) return "";
  const pie = `<div class="cap"><b>${escapar(adjunto.name)}</b>${adjunto.paso ? ` · ${escapar(adjunto.paso)}` : ""}</div>`;
  if (adjunto.type === "image/png" || adjunto.type === "image/jpeg") {
    return `<figure class="ev"><img src="data:${adjunto.type};base64,${contenido.toString("base64")}" alt="${escapar(adjunto.name)}">${pie}</figure>`;
  }
  if (adjunto.type === "text/html") {
    return `<figure class="ev"><iframe srcdoc="${escapar(contenido.toString("utf8"))}" loading="lazy"></iframe>${pie}</figure>`;
  }
  return "";
};

const esperadoDe = (resultado) => {
  const html = resultado.descriptionHtml ?? "";
  const parte = html.split(/<b>Resultado esperado\.<\/b>/)[1];
  return parte ? parte.replace(/<\/p>.*$/s, "").trim() : escapar(resultado.description ?? "Ver la regla del caso.");
};

const ESTILO = `
  :root { --tinta:#16211f; --suave:#5a6b68; --linea:#dfe6e5; --fondo:#f6f8f8; --rojo:#b3261e; --verde:#1e8449; --acento:#0f4c81; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--fondo); color:var(--tinta); font:14px/1.55 "Segoe UI", Roboto, Arial, sans-serif; }
  .hoja { max-width: 980px; margin: 24px auto; background:#fff; border:1px solid var(--linea); border-radius:8px; overflow:hidden; }
  header { padding:28px 36px; border-bottom:4px solid var(--rojo); }
  .pre { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--suave); }
  h1 { margin:6px 0 4px; font-size:22px; }
  h1 .id { color:var(--rojo); font-family: ui-monospace, Menlo, monospace; }
  .sub { color:var(--suave); }
  section { padding:22px 36px; border-bottom:1px solid var(--linea); }
  h2 { margin:0 0 12px; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--acento); }
  table.kv { width:100%; border-collapse:collapse; }
  table.kv td { padding:6px 8px; border-bottom:1px solid #eef2f1; vertical-align:top; }
  table.kv td.k { width:210px; color:var(--suave); font-size:12.5px; }
  code, .mono { font-family: ui-monospace, Menlo, monospace; font-size:12.5px; }
  ol, ul { margin:0; padding-left:20px; }
  li { margin:3px 0; }
  li.falla { color:var(--rojo); font-weight:600; }
  .dos { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .caja { border:1px solid var(--linea); border-radius:6px; padding:12px; }
  .caja.ok { border-left:4px solid var(--verde); }
  .caja.no { border-left:4px solid var(--rojo); background:#fdf6f5; }
  .caja h3 { margin:0 0 6px; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--suave); }
  pre { white-space:pre-wrap; word-break:break-word; margin:0; font:12.5px/1.5 ui-monospace, Menlo, monospace; }
  .ev { margin:0 0 18px; border:1px solid var(--linea); border-radius:6px; overflow:hidden; }
  .ev img { display:block; width:100%; }
  .ev iframe { display:block; width:100%; height:420px; border:0; }
  .cap { padding:8px 12px; background:var(--fondo); font-size:12.5px; color:var(--suave); }
  .pill { display:inline-block; padding:1px 8px; border-radius:10px; font-size:12px; font-weight:600; color:#fff; background:var(--rojo); }
  a { color:var(--acento); }
  footer { padding:16px 36px; font-size:12px; color:var(--suave); background:var(--fondo); }
`;

export function generarDocumento({ resultado, resultados, bug, estado, run, pipeline, proyecto, allureUrl, casoUrl, entorno }) {
  const epica = etiqueta(resultado, "epic")[0] ?? "";
  const historia = etiqueta(resultado, "feature")[0] ?? "";
  const escenario = etiqueta(resultado, "story")[0] ?? "";
  const caso = etiqueta(resultado, "qasl_case")[0] ?? "";
  const capa = etiqueta(resultado, "layer")[0] ?? "";
  const suite = etiqueta(resultado, "suite")[0] ?? etiqueta(resultado, "subSuite")[0] ?? "";
  const responsable = etiqueta(resultado, "owner")[0] ?? "";
  const severidad = SEVERIDAD[etiqueta(resultado, "severity")[0]] ?? "Sin definir";
  const reglas = etiqueta(resultado, "tag").filter((t) => /^@?(BR|E)\d+$/i.test(t)).map((t) => t.replace(/^@/, ""));
  const mensaje = (resultado.statusDetails?.message ?? "").replace(ANSI, "").trim();
  const traza = (resultado.statusDetails?.trace ?? "").replace(ANSI, "").split("\n").slice(0, 12).join("\n");
  const pasos = pasosDeNegocio(resultado.steps);
  const previas = precondiciones(resultado.steps);
  const adjuntos = recorrerAdjuntos(resultado.steps).concat(
    (resultado.attachments ?? []).map((a) => ({ ...a, paso: "Al finalizar el caso" })),
  );
  const evidencia = adjuntos.map((a) => bloqueEvidencia(resultados, a)).filter(Boolean);
  const sut = capa === "e2e" ? entorno.baseUrl : entorno.apiBaseUrl;
  const titulo = `${historia.split(" · ")[0]} · ${resultado.name}`;
  const hay = (v) => (v ? escapar(v) : "—");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte de Defecto ${escapar(bug)}</title><style>${ESTILO}</style></head>
<body><div class="hoja">
<header>
  <div class="pre">QASL · Reporte de Defecto · ISO/IEC/IEEE 29119-3</div>
  <h1><span class="id">${escapar(bug)}</span> ${escapar(resultado.name)}</h1>
  <div class="sub">${escapar(epica)} · ${escapar(historia)} · <span class="pill">${escapar(estado)}</span></div>
</header>

<section><h2>1. Identificacion</h2><table class="kv">
  <tr><td class="k">Identificador</td><td class="mono">${escapar(bug)}</td></tr>
  <tr><td class="k">Titulo</td><td>${escapar(titulo)}</td></tr>
  <tr><td class="k">Sistema (SUT)</td><td class="mono">${hay(sut)}</td></tr>
  <tr><td class="k">Ambiente</td><td>${hay(entorno.nombre)}</td></tr>
  <tr><td class="k">Capa de prueba</td><td>${hay(capa)}</td></tr>
  <tr><td class="k">Severidad</td><td>${escapar(severidad)}</td></tr>
  <tr><td class="k">Estado</td><td>${escapar(estado)}</td></tr>
  <tr><td class="k">Detectado por</td><td>Ejecucion automatizada · responsable ${hay(responsable)}</td></tr>
  <tr><td class="k">Fecha de deteccion</td><td>${escapar(fecha(resultado.stop ?? Date.now()))}</td></tr>
  <tr><td class="k">Fase de prueba</td><td>Regresion automatizada · pipeline <span class="mono">${hay(pipeline)}</span></td></tr>
</table></section>

<section><h2>2. Descripcion del defecto</h2>
  ${resultado.descriptionHtml ?? `<p>${escapar(resultado.description ?? "")}</p>`}
  <p>El caso <span class="mono">${escapar(caso)}</span> fallo: <b>${escapar(mensaje.split("\n")[0])}</b></p>
</section>

<section><h2>3. Precondiciones</h2>
  ${previas.length ? `<ul>${previas.map((p) => `<li>${escapar(p)}</li>`).join("")}</ul>` : "<p>Sin precondiciones declaradas por el caso.</p>"}
</section>

<section><h2>4. Pasos para reproducir</h2>
  <ol>${pasos.map((p) => `<li class="${p.status === "passed" ? "" : "falla"}">${escapar(p.name)}${p.status === "passed" ? "" : " — aca falla"}</li>`).join("")}</ol>
  <p class="sub">En la suite de automatizacion se reproduce con el caso <span class="mono">${escapar(resultado.name)}</span> (${escapar(suite)}).</p>
</section>

<section><h2>5. Resultado esperado vs. resultado obtenido</h2>
  <div class="dos">
    <div class="caja ok"><h3>Resultado esperado</h3>${esperadoDe(resultado)}</div>
    <div class="caja no"><h3>Resultado obtenido</h3><pre>${escapar(mensaje)}</pre></div>
  </div>
  ${traza ? `<details style="margin-top:12px"><summary class="sub">Traza de la falla</summary><pre>${escapar(traza)}</pre></details>` : ""}
</section>

<section><h2>6. Evidencia</h2>
  ${evidencia.length ? evidencia.join("\n") : "<p>La corrida no dejo capturas para este caso.</p>"}
  <p class="sub">El video completo del caso y la traza de Playwright estan en el <a href="${escapar(allureUrl)}">reporte de Allure de ${escapar(run)}</a>.</p>
</section>

<section><h2>7. Evaluacion</h2><table class="kv">
  <tr><td class="k">Severidad</td><td>${escapar(severidad)} · tomada de la severidad declarada del caso</td></tr>
  <tr><td class="k">Prioridad</td><td>A definir en el triage</td></tr>
  <tr><td class="k">Frecuencia</td><td>Reproducible: fallo en la corrida ${escapar(run)}</td></tr>
  <tr><td class="k">Clasificacion (IEEE 1044)</td><td>A definir en el triage</td></tr>
</table></section>

<section><h2>8. Trazabilidad</h2><table class="kv">
  <tr><td class="k">Epica</td><td>${hay(epica)}</td></tr>
  <tr><td class="k">Historia de usuario</td><td>${hay(historia)}</td></tr>
  <tr><td class="k">Escenario</td><td>${hay(escenario)}</td></tr>
  <tr><td class="k">Caso de prueba</td><td><a href="${escapar(casoUrl)}" class="mono">${hay(caso)}</a></td></tr>
  <tr><td class="k">Reglas y escenarios</td><td class="mono">${reglas.length ? escapar(reglas.join(" · ")) : "—"}</td></tr>
  <tr><td class="k">Suite</td><td>${hay(suite)}</td></tr>
  <tr><td class="k">Ejecucion</td><td class="mono">${escapar(proyecto)} · ${escapar(run)} · pipeline ${hay(pipeline)}</td></tr>
  <tr><td class="k">Evidencia completa</td><td><a href="${escapar(allureUrl)}">Reporte de Allure de ${escapar(run)}</a></td></tr>
</table></section>

<section><h2>9. Accion sugerida</h2><p>A criterio de Desarrollo.</p></section>

<section><h2>10. Normas de referencia</h2><ul>
  <li><b>ISTQB CTFL v4</b> · Reporte de defectos.</li>
  <li><b>ISO/IEC/IEEE 29119-3</b> · Documentacion de pruebas (registro de incidentes).</li>
  <li><b>IEEE 1044</b> · Clasificacion de anomalias del software.</li>
</ul></section>

<footer>QASL · Reporte de Defecto ${escapar(bug)} · generado desde el resultado de Allure de la corrida ${escapar(run)} · ${escapar(fecha(Date.now()))}</footer>
</div></body></html>`;

  const nombre = `${bug} - ${resultado.name.replace(/^TC-\d+\s*\|\s*/, "")}.html`.replace(/[\\/:*?"<>|]/g, "");
  return { nombre, html };
}
