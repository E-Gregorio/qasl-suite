import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { generarDocumento } from "./bug-documento.mjs";

config();

const REPORTE = "allure-report";
const RESULTADOS = "allure-results";
const DOCUMENTOS = "artefactos/bugs";
const CORRIDA = ".qasl-run.json";
const { QASL_URL, QASL_TOKEN } = process.env;

const archivos = (carpeta, base = carpeta) =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta, base) : [path.relative(base, ruta).split(path.sep).join("/")];
  });

if (!QASL_URL || !QASL_TOKEN) {
  console.log("[QASL] Sin QASL_URL o QASL_TOKEN: el reporte de Allure no se adjunta.");
  process.exit(0);
}
if (!existsSync(CORRIDA)) {
  console.log("[QASL] No hay una corrida publicada en QASL: corré las pruebas con QASL_URL y QASL_TOKEN antes de adjuntar el reporte.");
  process.exit(0);
}
if (!existsSync(path.join(REPORTE, "index.html"))) {
  console.error("[QASL] No existe allure-report/index.html: generá el reporte con npm run allure:generate.");
  process.exit(1);
}

const corrida = JSON.parse(readFileSync(CORRIDA, "utf8"));
const { project, run } = corrida;
const files = Object.fromEntries(
  archivos(REPORTE).map((archivo) => [archivo, readFileSync(path.join(REPORTE, archivo)).toString("base64")]),
);

const respuesta = await fetch(`${QASL_URL}/api/projects/${encodeURIComponent(project)}/runs/${run}/allure`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${QASL_TOKEN}` },
  body: JSON.stringify({ files }),
});
const cuerpo = await respuesta.json().catch(() => ({}));
if (!respuesta.ok) {
  console.error(`[QASL] No se pudo adjuntar el reporte de Allure a ${run}: ${cuerpo.error ?? respuesta.status}`);
  process.exit(1);
}
console.log(`[QASL] Reporte de Allure adjunto a ${run} (${cuerpo.files} archivos). Abrilo desde Runs en QASL Manual Testing.`);

const bugs = Object.entries(corrida.bugs ?? {});
if (bugs.length) {
  const web = process.env.QASL_WEB_URL;
  const allureUrl = `${QASL_URL}/api/projects/${encodeURIComponent(project)}/runs/${run}/allure/index.html`;
  const estadoDe = (bug) =>
    (corrida.reopened ?? []).includes(bug)
      ? "Activo · regresion"
      : (corrida.updated ?? []).includes(bug)
        ? "Activo · sigue presente"
        : "Nuevo";
  const resultadosPorCaso = new Map(
    readdirSync(RESULTADOS)
      .filter((archivo) => archivo.endsWith("-result.json"))
      .map((archivo) => JSON.parse(readFileSync(path.join(RESULTADOS, archivo), "utf8")))
      .filter((r) => r.status !== "passed")
      .map((r) => [(r.labels ?? []).find((l) => l.name === "qasl_case")?.value?.replace(/\s+/g, "").toUpperCase(), r])
      .filter(([ref]) => ref),
  );
  mkdirSync(DOCUMENTOS, { recursive: true });
  for (const [ref, bug] of bugs) {
    const resultado = resultadosPorCaso.get(ref);
    if (!resultado) continue;
    const casoKey = `${ref.split("|")[0]}-${ref.split("|").at(-1)}`;
    const { nombre, html } = generarDocumento({
      resultado,
      resultados: RESULTADOS,
      bug,
      estado: estadoDe(bug),
      run,
      pipeline: corrida.pipeline,
      proyecto: project,
      allureUrl,
      casoUrl: web ? `${web}/cases/${casoKey}?proyecto=${encodeURIComponent(project)}` : casoKey,
      entorno: { nombre: process.env.ENV_NAME, baseUrl: process.env.BASE_URL, apiBaseUrl: process.env.API_BASE_URL },
    });
    writeFileSync(path.join(DOCUMENTOS, nombre), html);
    const subida = await fetch(`${QASL_URL}/api/projects/${encodeURIComponent(project)}/defects/${bug}/document`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${QASL_TOKEN}` },
      body: JSON.stringify({ name: nombre, html }),
    });
    const respuestaBug = await subida.json().catch(() => ({}));
    if (!subida.ok) {
      console.error(`[QASL] No se pudo adjuntar el documento de ${bug}: ${respuestaBug.error ?? subida.status}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`[QASL] Documento del defecto adjunto a ${bug}: ${nombre}`);
  }
}
