export interface HttpExchangeData {
  metodo: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseHeaders: Record<string, string>;
  responseBody?: unknown;
}

export const HEADERS_SENSIBLES = [
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "x-auth-token",
  "x-csrf-token",
  "x-access-token",
];

export const VALOR_ENMASCARADO = "••••••••";

const escapar = (valor: string): string =>
  valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatearCuerpo = (cuerpo: unknown): string => {
  if (cuerpo === undefined || cuerpo === null || cuerpo === "") return "(sin cuerpo)";
  if (typeof cuerpo === "string") {
    try {
      return JSON.stringify(JSON.parse(cuerpo), null, 2);
    } catch {
      return cuerpo;
    }
  }
  try {
    return JSON.stringify(cuerpo, null, 2);
  } catch {
    return String(cuerpo);
  }
};

const enmascarar = (
  headers: Record<string, string>,
  sensibles: string[],
): Array<[string, string]> =>
  Object.entries(headers).map(([nombre, valor]) => [
    nombre,
    sensibles.includes(nombre.toLowerCase()) ? VALOR_ENMASCARADO : valor,
  ]);

const colorDeStatus = (status: number): string => {
  if (status >= 500) return "#c0392b";
  if (status >= 400) return "#d35400";
  if (status >= 300) return "#2980b9";
  if (status >= 200) return "#1e8449";
  return "#566573";
};

const filas = (entradas: Array<[string, string]>): string =>
  entradas.length
    ? entradas
        .map(
          ([nombre, valor]) =>
            `<tr><td class="k">${escapar(nombre)}</td><td class="v">${escapar(valor)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" class="vacio">(sin headers)</td></tr>`;

const bloque = (titulo: string, contenido: string): string =>
  `<section><h2>${titulo}</h2>${contenido}</section>`;

const plegable = (titulo: string, cantidad: number, contenido: string): string =>
  `<details><summary>${titulo}<span class="cuenta">${cantidad}</span></summary>${contenido}</details>`;

export const construirHtml = (
  datos: HttpExchangeData,
  sensibles: string[] = HEADERS_SENSIBLES,
): string => {
  const color = colorDeStatus(datos.status);
  const cabecerasRequest = enmascarar(datos.requestHeaders, sensibles);
  const cabecerasResponse = enmascarar(datos.responseHeaders, sensibles);
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>HTTP exchange</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         margin: 0; padding: 10px 12px; background: #fbfcfc; color: #16211f; font-size: 12px; }
  header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
           border-bottom: 1px solid #dfe6e5; padding-bottom: 8px; }
  .metodo { font-weight: 700; letter-spacing: .04em; background: #16211f; color: #fff;
            padding: 2px 8px; border-radius: 3px; font-size: 11px; }
  .url { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all;
         flex: 1 1 260px; font-size: 12px; }
  .status { font-weight: 700; color: #fff; background: ${color}; padding: 2px 8px;
            border-radius: 3px; font-size: 11px; }
  .tiempo { color: #5a6b68; font-variant-numeric: tabular-nums; }
  section { margin-top: 10px; }
  h2 { font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
       color: #5a6b68; margin: 0 0 4px; font-weight: 700; }
  details { margin-top: 8px; border: 1px solid #dfe6e5; border-radius: 4px; background: #fff; }
  summary { cursor: pointer; padding: 5px 8px; font-size: 10px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .08em; color: #5a6b68; }
  .cuenta { display: inline-block; margin-left: 6px; background: #eef2f1; color: #33514c;
            border-radius: 8px; padding: 0 6px; font-size: 10px; letter-spacing: 0; }
  details table { border-top: 1px solid #eef2f1; }
  table { border-collapse: collapse; width: 100%; }
  td { border-bottom: 1px solid #f1f5f4; padding: 3px 8px; vertical-align: top; line-height: 1.4; }
  tr:last-child td { border-bottom: none; }
  td.k { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #33514c;
         width: 200px; word-break: break-all; }
  td.v { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
  td.vacio { color: #8a9997; font-style: italic; }
  pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f4f7f6;
        border: 1px solid #dfe6e5; border-radius: 4px; padding: 8px; margin: 0;
        max-height: 260px; overflow: auto; white-space: pre-wrap; word-break: break-word;
        line-height: 1.45; }
</style></head>
<body>
  <header>
    <span class="metodo">${escapar(datos.metodo)}</span>
    <span class="url">${escapar(datos.url)}</span>
    <span class="status">${datos.status} ${escapar(datos.statusText)}</span>
    <span class="tiempo">${datos.durationMs} ms</span>
  </header>
  ${bloque("Response body", `<pre>${escapar(formatearCuerpo(datos.responseBody))}</pre>`)}
  ${bloque("Request body", `<pre>${escapar(formatearCuerpo(datos.requestBody))}</pre>`)}
  ${plegable(
    "Response headers",
    cabecerasResponse.length,
    `<table>${filas(cabecerasResponse)}</table>`,
  )}
  ${plegable(
    "Request headers",
    cabecerasRequest.length,
    `<table>${filas(cabecerasRequest)}</table>`,
  )}
</body></html>`;
};

export const construirArchivoHttp = (
  datos: HttpExchangeData,
  sensibles: string[] = HEADERS_SENSIBLES,
): string => {
  const cabeceras = enmascarar(datos.requestHeaders, sensibles)
    .map(([nombre, valor]) => `${nombre}: ${valor}`)
    .join("\n");
  const cuerpo =
    datos.requestBody === undefined ? "" : `\n\n${formatearCuerpo(datos.requestBody)}`;
  return [
    `### ${datos.metodo} ${datos.url}`,
    `# respuesta observada: ${datos.status} ${datos.statusText} en ${datos.durationMs} ms`,
    "",
    `${datos.metodo} ${datos.url}`,
    cabeceras,
    cuerpo,
  ].join("\n");
};

export const textoDeStatus = (status: number): string => {
  const mapa: Record<number, string> = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return mapa[status] ?? "";
};
