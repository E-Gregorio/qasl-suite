import { attachHtml } from "@core/allure";

export interface FilaComparada {
  concepto: string;
  esperado: string;
  obtenido: string;
  cumple?: boolean;
}

const escapar = (texto: string): string =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const coincide = (fila: FilaComparada): boolean => fila.cumple ?? fila.obtenido.includes(fila.esperado);

const ESTILO = `
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         margin: 0; padding: 10px 12px; background: #fbfcfc; color: #16211f; font-size: 12px; }
  h1 { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #5a6b68; margin: 0 0 8px; }
  table { border-collapse: collapse; width: 100%; background: #fff; border: 1px solid #dfe6e5; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
       color: #5a6b68; padding: 6px 8px; border-bottom: 1px solid #dfe6e5; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f4; font-family: ui-monospace, Menlo, monospace; }
  td.c { font-family: inherit; font-weight: 600; }
  .ok { color: #fff; background: #1e8449; border-radius: 3px; padding: 1px 6px; font-weight: 700; font-size: 10px; }
  .no { color: #fff; background: #c0392b; border-radius: 3px; padding: 1px 6px; font-weight: 700; font-size: 10px; }
`;

export async function adjuntarEsperadoObtenido(
  titulo: string,
  filas: FilaComparada[],
  origen = "Obtenido",
): Promise<void> {
  const cuerpo = filas
    .map(
      (fila) =>
        `<tr><td class="c">${escapar(fila.concepto)}</td><td>${escapar(fila.esperado)}</td>` +
        `<td>${escapar(fila.obtenido)}</td>` +
        `<td><span class="${coincide(fila) ? "ok" : "no"}">${coincide(fila) ? "CUMPLE" : "NO CUMPLE"}</span></td></tr>`,
    )
    .join("");
  const html =
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>` +
    `<style>${ESTILO}</style></head><body><h1>${escapar(titulo)}</h1>` +
    `<table><thead><tr><th>Concepto</th><th>Esperado</th><th>${escapar(origen)}</th><th></th></tr></thead>` +
    `<tbody>${cuerpo}</tbody></table></body></html>`;
  await attachHtml(titulo, html);
}
