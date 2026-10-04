const escapar = (texto: string): string =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const resaltar = (texto: string): string => escapar(texto).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

export const descripcionHtml = (...parrafos: string[]): string =>
  parrafos.map((parrafo) => `<p style="margin:0 0 8px">${resaltar(parrafo)}</p>`).join("");
