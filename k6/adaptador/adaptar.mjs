import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

const DIRECTORIO = process.env.SALIDA_DIR || "artefactos/k6";
const CRUDO = `${DIRECTORIO}/crudo.json`;
const RESUMEN = `${DIRECTORIO}/resumen.json`;
const DESTINO = `${DIRECTORIO}/metricas.json`;

const FASES = [
  "http_req_blocked",
  "http_req_connecting",
  "http_req_tls_handshaking",
  "http_req_sending",
  "http_req_waiting",
  "http_req_receiving",
];

const percentil = (ordenados, p) => {
  if (!ordenados.length) return 0;
  const posicion = (ordenados.length - 1) * p;
  const inferior = Math.floor(posicion);
  const superior = Math.ceil(posicion);
  if (inferior === superior) return ordenados[inferior];
  return ordenados[inferior] + (ordenados[superior] - ordenados[inferior]) * (posicion - inferior);
};

const redondear = (valor) => Number(Number(valor).toFixed(2));

const estadisticas = (valores) => {
  if (!valores.length) {
    return { n: 0, min: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  }
  const ordenados = [...valores].sort((a, b) => a - b);
  const suma = ordenados.reduce((total, valor) => total + valor, 0);
  return {
    n: ordenados.length,
    min: redondear(ordenados[0]),
    avg: redondear(suma / ordenados.length),
    p50: redondear(percentil(ordenados, 0.5)),
    p90: redondear(percentil(ordenados, 0.9)),
    p95: redondear(percentil(ordenados, 0.95)),
    p99: redondear(percentil(ordenados, 0.99)),
    max: redondear(ordenados[ordenados.length - 1]),
  };
};

const claseDeStatus = (status) => {
  const codigo = Number(status);
  if (codigo >= 500) return "5xx";
  if (codigo >= 400) return "4xx";
  if (codigo >= 300) return "3xx";
  if (codigo >= 200) return "2xx";
  return "otros";
};

const nuevoEndpoint = (nombre) => ({
  nombre,
  metodo: "",
  duraciones: [],
  fases: Object.fromEntries(FASES.map((fase) => [fase, []])),
  status: {},
  peticiones: 0,
  fallidas: 0,
  bytesRecibidos: 0,
});

const nuevoBucket = () => ({
  duraciones: [],
  peticiones: 0,
  fallidas: 0,
  status: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, otros: 0 },
  vus: 0,
});

const histograma = (valores, cantidadDeClases = 24) => {
  if (!valores.length) return { bordes: [], frecuencias: [] };
  const ordenados = [...valores].sort((a, b) => a - b);
  const minimo = ordenados[0];
  const maximo = percentil(ordenados, 0.995);
  const ancho = (maximo - minimo) / cantidadDeClases || 1;
  const frecuencias = new Array(cantidadDeClases).fill(0);
  for (const valor of ordenados) {
    const indice = Math.min(cantidadDeClases - 1, Math.max(0, Math.floor((valor - minimo) / ancho)));
    frecuencias[indice] += 1;
  }
  const bordes = Array.from({ length: cantidadDeClases + 1 }, (_, i) => redondear(minimo + ancho * i));
  return { bordes, frecuencias };
};

const adaptar = async () => {
  if (!existsSync(CRUDO)) {
    throw new Error(`No existe ${CRUDO}. Corre k6 con --out json=${CRUDO}`);
  }
  if (!existsSync(RESUMEN)) {
    throw new Error(`No existe ${RESUMEN}. El escenario debe exportar handleSummary`);
  }

  const resumen = JSON.parse(readFileSync(RESUMEN, "utf8"));

  const buckets = new Map();
  const porEndpoint = new Map();
  const duracionesGlobales = [];
  const fasesGlobales = Object.fromEntries(FASES.map((fase) => [fase, []]));
  const statusGlobal = {};
  const erroresPorTipo = new Map();
  const checksPorNombre = new Map();

  let inicioMs = null;
  let finMs = null;
  let peticiones = 0;
  let fallidas = 0;
  let iteraciones = 0;
  let datosEnviados = 0;
  let datosRecibidos = 0;
  let vusMax = 0;

  const lector = createInterface({
    input: createReadStream(CRUDO, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const linea of lector) {
    if (!linea || linea[0] !== "{") continue;
    let registro;
    try {
      registro = JSON.parse(linea);
    } catch {
      continue;
    }
    if (registro.type !== "Point") continue;

    const metrica = registro.metric;
    const datos = registro.data;
    const marca = Date.parse(datos.time);
    if (Number.isNaN(marca)) continue;

    if (inicioMs === null || marca < inicioMs) inicioMs = marca;
    if (finMs === null || marca > finMs) finMs = marca;

    const tags = datos.tags ?? {};
    const nombre = tags.name || "sin-nombre";
    const valor = datos.value;

    if (metrica === "vus" || metrica === "vus_max") {
      if (metrica === "vus_max") vusMax = Math.max(vusMax, valor);
      if (metrica === "vus") {
        const segundo = Math.floor(marca / 1000);
        if (!buckets.has(segundo)) buckets.set(segundo, nuevoBucket());
        buckets.get(segundo).vus = Math.max(buckets.get(segundo).vus, valor);
      }
      continue;
    }

    if (metrica === "iterations") {
      iteraciones += valor;
      continue;
    }
    if (metrica === "data_sent") {
      datosEnviados += valor;
      continue;
    }
    if (metrica === "data_received") {
      datosRecibidos += valor;
      continue;
    }
    if (metrica === "checks") {
      const clave = tags.check || "sin-nombre";
      if (!checksPorNombre.has(clave)) checksPorNombre.set(clave, { nombre: clave, ok: 0, fallidos: 0 });
      const registroCheck = checksPorNombre.get(clave);
      if (valor === 1) registroCheck.ok += 1;
      else registroCheck.fallidos += 1;
      continue;
    }

    if (FASES.includes(metrica)) {
      fasesGlobales[metrica].push(valor);
      if (!porEndpoint.has(nombre)) porEndpoint.set(nombre, nuevoEndpoint(nombre));
      porEndpoint.get(nombre).fases[metrica].push(valor);
      continue;
    }

    if (metrica === "http_req_duration") {
      const segundo = Math.floor(marca / 1000);
      if (!buckets.has(segundo)) buckets.set(segundo, nuevoBucket());
      buckets.get(segundo).duraciones.push(valor);
      duracionesGlobales.push(valor);
      if (!porEndpoint.has(nombre)) porEndpoint.set(nombre, nuevoEndpoint(nombre));
      porEndpoint.get(nombre).duraciones.push(valor);
      continue;
    }

    if (metrica === "http_reqs") {
      const segundo = Math.floor(marca / 1000);
      if (!buckets.has(segundo)) buckets.set(segundo, nuevoBucket());
      const bucket = buckets.get(segundo);
      const clase = claseDeStatus(tags.status);

      peticiones += 1;
      bucket.peticiones += 1;
      bucket.status[clase] += 1;
      statusGlobal[tags.status] = (statusGlobal[tags.status] ?? 0) + 1;

      if (!porEndpoint.has(nombre)) porEndpoint.set(nombre, nuevoEndpoint(nombre));
      const endpoint = porEndpoint.get(nombre);
      endpoint.peticiones += 1;
      endpoint.metodo = tags.method || endpoint.metodo;
      endpoint.status[tags.status] = (endpoint.status[tags.status] ?? 0) + 1;

      if (tags.expected_response === "false") {
        fallidas += 1;
        bucket.fallidas += 1;
        endpoint.fallidas += 1;
        const tipo = tags.error_code ? `error ${tags.error_code}` : `HTTP ${tags.status}`;
        if (!erroresPorTipo.has(tipo)) {
          erroresPorTipo.set(tipo, { tipo, cantidad: 0, endpoints: new Set() });
        }
        const error = erroresPorTipo.get(tipo);
        error.cantidad += 1;
        error.endpoints.add(nombre);
      }
    }
  }

  const segundos = [...buckets.keys()].sort((a, b) => a - b);
  const base = segundos[0] ?? 0;
  const series = {
    intervaloSegundos: 1,
    t: [],
    vus: [],
    rps: [],
    errores: [],
    p50: [],
    p90: [],
    p95: [],
    p99: [],
    status: { "2xx": [], "3xx": [], "4xx": [], "5xx": [], otros: [] },
  };

  let vusPrevio = 0;
  for (const segundo of segundos) {
    const bucket = buckets.get(segundo);
    const ordenados = [...bucket.duraciones].sort((a, b) => a - b);
    vusPrevio = bucket.vus || vusPrevio;
    series.t.push(segundo - base);
    series.vus.push(vusPrevio);
    series.rps.push(bucket.peticiones);
    series.errores.push(bucket.fallidas);
    series.p50.push(redondear(percentil(ordenados, 0.5)));
    series.p90.push(redondear(percentil(ordenados, 0.9)));
    series.p95.push(redondear(percentil(ordenados, 0.95)));
    series.p99.push(redondear(percentil(ordenados, 0.99)));
    for (const clase of Object.keys(series.status)) {
      series.status[clase].push(bucket.status[clase]);
    }
  }

  const duracionMs = inicioMs !== null && finMs !== null ? finMs - inicioMs : 0;
  const duracionSegundos = Math.max(1, duracionMs / 1000);

  const endpoints = [...porEndpoint.values()]
    .filter((endpoint) => endpoint.peticiones > 0)
    .map((endpoint) => ({
      nombre: endpoint.nombre,
      metodo: endpoint.metodo,
      peticiones: endpoint.peticiones,
      fallidas: endpoint.fallidas,
      tasaErrorPct: redondear((endpoint.fallidas / endpoint.peticiones) * 100),
      latencia: estadisticas(endpoint.duraciones),
      fases: Object.fromEntries(
        FASES.map((fase) => [fase.replace("http_req_", ""), estadisticas(endpoint.fases[fase]).avg]),
      ),
      status: endpoint.status,
    }))
    .sort((a, b) => b.latencia.p95 - a.latencia.p95);

  const metricas = {
    version: "1.0.0",
    identificacion: {
      ...resumen.identificacion,
      inicio: inicioMs ? new Date(inicioMs).toISOString() : null,
      fin: finMs ? new Date(finMs).toISOString() : null,
      duracionMs,
    },
    perfil: { ...resumen.perfil, vusMax },
    dictamen: resumen.dictamen,
    resumen: {
      peticiones,
      fallidas,
      tasaErrorPct: peticiones ? redondear((fallidas / peticiones) * 100) : 0,
      throughputRps: redondear(peticiones / duracionSegundos),
      vusMax,
      iteraciones,
      datosEnviadosBytes: datosEnviados,
      datosRecibidosBytes: datosRecibidos,
    },
    latencia: estadisticas(duracionesGlobales),
    fases: Object.fromEntries(
      FASES.map((fase) => [fase.replace("http_req_", ""), estadisticas(fasesGlobales[fase])]),
    ),
    status: statusGlobal,
    endpoints,
    series,
    histograma: histograma(duracionesGlobales),
    checks: [...checksPorNombre.values()].map((check) => ({
      ...check,
      tasaOkPct: redondear((check.ok / Math.max(1, check.ok + check.fallidos)) * 100),
    })),
    errores: [...erroresPorTipo.values()].map((error) => ({
      tipo: error.tipo,
      cantidad: error.cantidad,
      endpoints: [...error.endpoints],
    })),
  };

  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, JSON.stringify(metricas, null, 2));

  if (process.env.CONSERVAR_CRUDO !== "1") {
    rmSync(CRUDO, { force: true });
  }

  console.log(`metricas.json escrito: ${peticiones} peticiones, ${series.t.length} segundos de serie`);
};

adaptar().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
