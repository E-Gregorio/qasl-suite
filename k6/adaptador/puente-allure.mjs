import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";

const DIRECTORIO = process.env.SALIDA_DIR || "artefactos/k6";
const RESULTADOS = process.env.ALLURE_RESULTS_DIR || "allure-results";
const ORIGEN = `${DIRECTORIO}/metricas.json`;
const INFORME = `${DIRECTORIO}/informe.html`;

const identificador = (texto) => createHash("md5").update(texto).digest("hex");

const formatear = (valor, unidad) => {
  if (valor === null || valor === undefined) return "sin dato";
  if (unidad === "ratio") return `${(valor * 100).toFixed(2)} %`;
  return `${valor} ${unidad}`;
};

const adjuntar = (ruta, nombre, tipo) => {
  if (!existsSync(ruta)) return null;
  const destino = `${randomUUID()}-attachment.${tipo === "text/html" ? "html" : "json"}`;
  copyFileSync(ruta, `${RESULTADOS}/${destino}`);
  return { name: nombre, source: destino, type: tipo };
};

if (!existsSync(ORIGEN)) {
  console.error(`No existe ${ORIGEN}. Corre primero el adaptador.`);
  process.exit(1);
}

const m = JSON.parse(readFileSync(ORIGEN, "utf8"));
mkdirSync(RESULTADOS, { recursive: true });

const inicio = m.identificacion.inicio ? Date.parse(m.identificacion.inicio) : Date.now();
const fin = m.identificacion.fin ? Date.parse(m.identificacion.fin) : inicio;

const adjuntoInforme = adjuntar(INFORME, "Informe de rendimiento", "text/html");
const adjuntoMetricas = adjuntar(ORIGEN, "metricas.json", "application/json");
const adjuntos = [adjuntoInforme, adjuntoMetricas].filter(Boolean);

const etiquetasComunes = [
  { name: "layer", value: "performance" },
  { name: "epic", value: m.identificacion.proyecto },
  { name: "feature", value: "Rendimiento" },
  { name: "story", value: `Prueba de ${m.identificacion.tipoDePrueba}` },
  { name: "suite", value: `Rendimiento · ${m.identificacion.codigoFuncional}` },
  { name: "owner", value: m.identificacion.responsable },
  { name: "tag", value: "performance" },
  { name: "tag", value: m.identificacion.tipoDePrueba },
];

const descripcion = [
  `**Perfil de carga.** ${m.perfil.descripcion}`,
  "",
  `**Sistema bajo prueba.** ${m.identificacion.sut} · ambiente ${m.identificacion.ambiente}`,
  "",
  `**Resultado de la corrida.** ${m.resumen.peticiones} peticiones · ${m.resumen.throughputRps} req/s · `
    + `tasa de error ${m.resumen.tasaErrorPct} % · p95 ${m.latencia.p95} ms · p99 ${m.latencia.p99} ms`,
  "",
  "El analisis completo con las series temporales, la descomposicion por fase y el detalle por endpoint",
  "esta en el adjunto **Informe de rendimiento**.",
].join("\n");

let escritos = 0;

for (const umbral of m.dictamen.umbrales) {
  const nombre = `${umbral.id} · ${umbral.descripcion}`;
  const estado = umbral.cumple === null ? "broken" : umbral.cumple ? "passed" : "failed";

  const resultado = {
    uuid: randomUUID(),
    historyId: identificador(`${m.identificacion.codigoFuncional}:${umbral.id}`),
    testCaseId: identificador(`${m.identificacion.codigoFuncional}:${umbral.id}`),
    name: nombre,
    fullName: `Rendimiento · ${m.identificacion.codigoFuncional} · ${umbral.id}`,
    status: estado,
    stage: "finished",
    start: inicio,
    stop: fin,
    description: descripcion,
    labels: [...etiquetasComunes, { name: "severity", value: umbral.severidad }],
    links: [],
    parameters: [
      { name: "metrica", value: umbral.metrica },
      { name: "expresion", value: umbral.expresion },
      { name: "limite", value: formatear(umbral.limite, umbral.unidad) },
      { name: "observado", value: formatear(umbral.observado, umbral.unidad) },
      { name: "desvio", value: umbral.desviacionPct === null ? "sin dato" : `${umbral.desviacionPct} %` },
      { name: "ambiente", value: m.identificacion.ambiente },
      { name: "tipo de prueba", value: m.identificacion.tipoDePrueba },
    ],
    steps: [
      {
        name: `Medir ${umbral.metrica}`,
        status: "passed",
        stage: "finished",
        start: inicio,
        stop: fin,
        steps: [],
        attachments: [],
        parameters: [],
      },
      {
        name: `Contrastar ${umbral.expresion} · observado ${formatear(umbral.observado, umbral.unidad)}`,
        status: estado,
        stage: "finished",
        start: fin,
        stop: fin,
        steps: [],
        attachments: [],
        parameters: [],
      },
    ],
    attachments: adjuntos,
  };

  if (estado === "failed") {
    resultado.statusDetails = {
      message: `Se acordo ${umbral.expresion} y se observo ${formatear(umbral.observado, umbral.unidad)}`,
      trace:
        `Acuerdo de servicio ${umbral.id}\n` +
        `Descripcion: ${umbral.descripcion}\n` +
        `Metrica: ${umbral.metrica}\n` +
        `Limite acordado: ${formatear(umbral.limite, umbral.unidad)}\n` +
        `Valor observado: ${formatear(umbral.observado, umbral.unidad)}\n` +
        `Desvio: ${umbral.desviacionPct} %\n` +
        `Perfil de carga: ${m.perfil.descripcion}`,
    };
  }

  writeFileSync(`${RESULTADOS}/${resultado.uuid}-result.json`, JSON.stringify(resultado, null, 2));
  escritos += 1;
}

const entorno = [
  `Rendimiento.SUT=${m.identificacion.sut}`,
  `Rendimiento.Ambiente=${m.identificacion.ambiente}`,
  `Rendimiento.Tipo_de_prueba=${m.identificacion.tipoDePrueba}`,
  `Rendimiento.Usuarios_maximos=${m.resumen.vusMax}`,
  `Rendimiento.Herramienta=${m.identificacion.herramienta}`,
].join("\n");

writeFileSync(`${RESULTADOS}/environment.properties`, entorno);

console.log(`puente Allure: ${escritos} acuerdos de servicio escritos en ${RESULTADOS}`);
