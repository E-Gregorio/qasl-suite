export const acuerdoDeServicio = [
  {
    id: "SLO-01",
    descripcion: "El percentil 95 del tiempo de respuesta global no supera 500 ms",
    metrica: "http_req_duration",
    expresion: "p(95)<500",
    limite: 500,
    unidad: "ms",
    comparador: "menor",
    severidad: "critical",
  },
  {
    id: "SLO-02",
    descripcion: "El percentil 99 del tiempo de respuesta global no supera 1500 ms",
    metrica: "http_req_duration",
    expresion: "p(99)<1500",
    limite: 1500,
    unidad: "ms",
    comparador: "menor",
    severidad: "normal",
  },
  {
    id: "SLO-03",
    descripcion: "La tasa de peticiones fallidas se mantiene por debajo del 1 %",
    metrica: "http_req_failed",
    expresion: "rate<0.01",
    limite: 0.01,
    unidad: "ratio",
    comparador: "menor",
    severidad: "blocker",
  },
  {
    id: "SLO-04",
    descripcion: "El percentil 95 del alta de pedidos no supera 900 ms",
    metrica: "http_req_duration{name:pedido}",
    expresion: "p(95)<900",
    limite: 900,
    unidad: "ms",
    comparador: "menor",
    severidad: "critical",
  },
  {
    id: "SLO-05",
    descripcion: "Al menos el 99 % de las verificaciones funcionales resultan correctas",
    metrica: "checks",
    expresion: "rate>0.99",
    limite: 0.99,
    unidad: "ratio",
    comparador: "mayor",
    severidad: "critical",
  },
];

export const thresholdsDeK6 = () => {
  const thresholds = {};
  for (const slo of acuerdoDeServicio) {
    thresholds[slo.metrica] = [...(thresholds[slo.metrica] ?? []), slo.expresion];
  }
  return thresholds;
};
