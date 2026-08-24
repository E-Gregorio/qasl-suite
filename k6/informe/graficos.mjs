export const PALETA = {
  serie: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
  serieOscura: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"],
  ordinal: ["#86b6ef", "#3987e5", "#256abf", "#104281"],
  ordinalOscura: ["#9ec5f4", "#5598e7", "#2a78d6", "#184f95"],
  estado: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
  secuencial: "#2a78d6",
};

const escapar = (texto) =>
  String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escala = (min, max, desde, hasta) => {
  const rango = max - min || 1;
  return (valor) => desde + ((valor - min) / rango) * (hasta - desde);
};

const numeroCorto = (valor) => {
  if (valor >= 1000000) return `${(valor / 1000000).toFixed(1)}M`;
  if (valor >= 1000) return `${(valor / 1000).toFixed(1)}k`;
  if (valor >= 100) return valor.toFixed(0);
  if (valor >= 10) return valor.toFixed(0);
  return Number(valor.toFixed(1)).toString();
};

const marcasDeEje = (min, max, cantidad = 5) => {
  const paso = (max - min) / cantidad || 1;
  return Array.from({ length: cantidad + 1 }, (_, i) => min + paso * i);
};

const LIENZO = { ancho: 920, alto: 268, margen: { arriba: 26, derecha: 16, abajo: 30, izquierda: 54 } };

const areaUtil = (lienzo = LIENZO) => ({
  x0: lienzo.margen.izquierda,
  x1: lienzo.ancho - lienzo.margen.derecha,
  y0: lienzo.alto - lienzo.margen.abajo,
  y1: lienzo.margen.arriba,
});

const rejilla = (marcas, ey, area, formato) =>
  marcas
    .map(
      (marca) =>
        `<line class="rejilla" x1="${area.x0}" x2="${area.x1}" y1="${ey(marca).toFixed(1)}" y2="${ey(marca).toFixed(1)}"/>` +
        `<text class="tick" x="${area.x0 - 8}" y="${(ey(marca) + 3.5).toFixed(1)}" text-anchor="end">${formato(marca)}</text>`,
    )
    .join("");

const ejeInferior = (marcas, ex, area, formato) =>
  marcas
    .map(
      (marca) =>
        `<text class="tick" x="${ex(marca).toFixed(1)}" y="${area.y0 + 18}" text-anchor="middle">${formato(marca)}</text>`,
    )
    .join("");

const envolver = (contenido, lienzo = LIENZO) =>
  `<svg viewBox="0 0 ${lienzo.ancho} ${lienzo.alto}" preserveAspectRatio="xMidYMid meet" role="img">${contenido}</svg>`;

export const graficoDeLineas = ({ t, series, unidad = "ms", tituloEjeY = "" }) => {
  const area = areaUtil();
  const maximo = Math.max(1, ...series.flatMap((serie) => serie.valores));
  const ex = escala(t[0], t[t.length - 1], area.x0, area.x1);
  const ey = escala(0, maximo * 1.08, area.y0, area.y1);

  const marcasY = marcasDeEje(0, maximo * 1.08, 4);
  const marcasX = marcasDeEje(t[0], t[t.length - 1], 6).map((v) => Math.round(v));

  const lineas = series
    .map((serie, indice) => {
      const d = serie.valores
        .map((valor, i) => `${i === 0 ? "M" : "L"}${ex(t[i]).toFixed(1)},${ey(valor).toFixed(1)}`)
        .join(" ");
      return `<path class="linea" d="${d}" stroke="var(--serie-${indice + 1})"/>`;
    })
    .join("");

  const puntosHover = t
    .map((momento, i) => {
      const detalle = series.map((s) => `${s.nombre}: ${numeroCorto(s.valores[i])} ${unidad}`).join(" · ");
      return `<rect class="zona" x="${(ex(momento) - 4).toFixed(1)}" y="${area.y1}" width="8" height="${area.y0 - area.y1}" data-info="${escapar(`t=${momento}s · ${detalle}`)}"/>`;
    })
    .join("");

  return envolver(
    `${rejilla(marcasY, ey, area, (v) => numeroCorto(v))}
     <line class="base" x1="${area.x0}" x2="${area.x1}" y1="${area.y0}" y2="${area.y0}"/>
     ${lineas}
     ${ejeInferior(marcasX, ex, area, (v) => `${v}s`)}
     <text class="rotulo" x="4" y="12">${escapar(tituloEjeY)}</text>
     ${puntosHover}`,
  );
};

export const graficoDeAreaApilada = ({ t, series, unidad = "", tituloEjeY = "" }) => {
  const area = areaUtil();
  const totales = t.map((_, i) => series.reduce((suma, serie) => suma + serie.valores[i], 0));
  const maximo = Math.max(1, ...totales);
  const ex = escala(t[0], t[t.length - 1], area.x0, area.x1);
  const ey = escala(0, maximo * 1.08, area.y0, area.y1);

  const acumulado = new Array(t.length).fill(0);
  const capas = series
    .map((serie) => {
      const inferior = [...acumulado];
      const superior = acumulado.map((valor, i) => valor + serie.valores[i]);
      for (let i = 0; i < acumulado.length; i++) acumulado[i] = superior[i];
      const arriba = superior.map((valor, i) => `${i === 0 ? "M" : "L"}${ex(t[i]).toFixed(1)},${ey(valor).toFixed(1)}`).join(" ");
      const abajo = inferior
        .map((valor, i) => `L${ex(t[t.length - 1 - i]).toFixed(1)},${ey(inferior[inferior.length - 1 - i]).toFixed(1)}`)
        .join(" ");
      return `<path class="capa" d="${arriba} ${abajo} Z" fill="${serie.color}"/>`;
    })
    .join("");

  const marcasY = marcasDeEje(0, maximo * 1.08, 4);
  const marcasX = marcasDeEje(t[0], t[t.length - 1], 6).map((v) => Math.round(v));

  const puntosHover = t
    .map((momento, i) => {
      const detalle = series
        .filter((s) => s.valores[i] > 0)
        .map((s) => `${s.nombre}: ${numeroCorto(s.valores[i])}`)
        .join(" · ");
      return `<rect class="zona" x="${(ex(momento) - 4).toFixed(1)}" y="${area.y1}" width="8" height="${area.y0 - area.y1}" data-info="${escapar(`t=${momento}s · ${detalle || "sin datos"} ${unidad}`)}"/>`;
    })
    .join("");

  return envolver(
    `${rejilla(marcasY, ey, area, (v) => numeroCorto(v))}
     ${capas}
     <line class="base" x1="${area.x0}" x2="${area.x1}" y1="${area.y0}" y2="${area.y0}"/>
     ${ejeInferior(marcasX, ex, area, (v) => `${v}s`)}
     <text class="rotulo" x="4" y="12">${escapar(tituloEjeY)}</text>
     ${puntosHover}`,
  );
};

export const graficoDeBarras = ({ etiquetas, valores, color, unidad = "", tituloEjeY = "" }) => {
  const lienzo = { ...LIENZO, alto: 220 };
  const area = areaUtil(lienzo);
  const maximo = Math.max(1, ...valores);
  const ey = escala(0, maximo * 1.08, area.y0, area.y1);
  const ancho = (area.x1 - area.x0) / valores.length;

  const barras = valores
    .map((valor, i) => {
      const x = area.x0 + ancho * i + 1;
      const w = Math.max(1, ancho - 2);
      const y = ey(valor);
      const h = area.y0 - y;
      return `<rect class="barra" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" fill="${color}" data-info="${escapar(`${etiquetas[i]} · ${numeroCorto(valor)} ${unidad}`)}"/>`;
    })
    .join("");

  const marcasY = marcasDeEje(0, maximo * 1.08, 4);
  const cada = Math.max(1, Math.ceil(etiquetas.length / 8));
  const ejeTexto = etiquetas
    .map((etiqueta, i) =>
      i % cada === 0
        ? `<text class="tick" x="${(area.x0 + ancho * i + ancho / 2).toFixed(1)}" y="${area.y0 + 18}" text-anchor="middle">${escapar(etiqueta)}</text>`
        : "",
    )
    .join("");

  return envolver(
    `${rejilla(marcasY, ey, area, (v) => numeroCorto(v))}
     ${barras}
     <line class="base" x1="${area.x0}" x2="${area.x1}" y1="${area.y0}" y2="${area.y0}"/>
     ${ejeTexto}
     <text class="rotulo" x="4" y="12">${escapar(tituloEjeY)}</text>`,
    lienzo,
  );
};

export const graficoDeBarrasApiladas = ({ filas, series, unidad = "ms" }) => {
  const altoFila = 34;
  const lienzo = { ancho: 920, alto: filas.length * altoFila + 46, margen: { arriba: 10, derecha: 16, abajo: 26, izquierda: 130 } };
  const area = areaUtil(lienzo);
  const totales = filas.map((fila) => series.reduce((suma, serie) => suma + (fila.valores[serie.clave] ?? 0), 0));
  const maximo = Math.max(0.01, ...totales);
  const ex = escala(0, maximo * 1.05, area.x0, area.x1);

  const barras = filas
    .map((fila, indice) => {
      const y = area.y1 + indice * altoFila + 6;
      let x = area.x0;
      const segmentos = series
        .map((serie) => {
          const valor = fila.valores[serie.clave] ?? 0;
          const w = Math.max(0, ex(valor) - area.x0);
          const rect = w > 0.5
            ? `<rect class="segmento" x="${x.toFixed(1)}" y="${y}" width="${Math.max(0, w - 2).toFixed(1)}" height="18" rx="3" fill="${serie.color}" data-info="${escapar(`${fila.nombre} · ${serie.nombre}: ${numeroCorto(valor)} ${unidad}`)}"/>`
            : "";
          x += w;
          return rect;
        })
        .join("");
      return `<text class="etiqueta" x="${area.x0 - 10}" y="${y + 13}" text-anchor="end">${escapar(fila.nombre)}</text>${segmentos}<text class="valor" x="${(x + 8).toFixed(1)}" y="${y + 13}">${numeroCorto(totales[indice])} ${unidad}</text>`;
    })
    .join("");

  const marcasX = marcasDeEje(0, maximo * 1.05, 5);
  const ejeTexto = marcasX
    .map((marca) => `<text class="tick" x="${ex(marca).toFixed(1)}" y="${lienzo.alto - 8}" text-anchor="middle">${numeroCorto(marca)}</text>`)
    .join("");

  return envolver(`${barras}${ejeTexto}`, lienzo);
};

export const leyenda = (entradas) =>
  `<div class="leyenda">${entradas
    .map(
      (entrada) =>
        `<span class="item"><span class="muestra" style="background:${entrada.color}"></span>${escapar(entrada.nombre)}</span>`,
    )
    .join("")}</div>`;

export { escapar, numeroCorto };
