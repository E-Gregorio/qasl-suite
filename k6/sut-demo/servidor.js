const http = require("http");

const PUERTO = Number(process.env.SUT_PORT || 4300);
const CAPACIDAD = Number(process.env.SUT_CAPACIDAD || 18);
const COLA_MAXIMA = Number(process.env.SUT_COLA_MAXIMA || 45);

let enVuelo = 0;

const catalogo = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  nombre: `Producto ${i + 1}`,
  precio: Number((9.9 * (i + 1)).toFixed(2)),
  descripcion: "Descripcion extensa del producto para que la respuesta tenga peso real. ".repeat(6),
  categoria: ["electronica", "hogar", "farmacia", "cuidado personal"][i % 4],
}));

const json = (res, status, payload, extra = {}) => {
  const cuerpo = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(cuerpo),
    ...extra,
  });
  res.end(cuerpo);
};

const demora = (base) => {
  const exceso = Math.max(0, enVuelo - CAPACIDAD);
  const penalizacion = exceso * exceso * 2.2;
  const ruido = Math.random() * base * 0.25;
  return base + penalizacion + ruido;
};

const responderCon = (res, ms, fn) => {
  enVuelo += 1;
  setTimeout(() => {
    enVuelo -= 1;
    fn();
  }, ms);
};

const rutas = {
  "POST /api/login": (req, res) => {
    responderCon(res, demora(35), () =>
      json(res, 200, { token: "tok_" + Math.random().toString(36).slice(2, 18), expiraEn: 3600 }),
    );
  },
  "GET /api/catalogo": (req, res) => {
    responderCon(res, demora(70), () => json(res, 200, { total: catalogo.length, datos: catalogo }));
  },
  "GET /api/perfil": (req, res) => {
    responderCon(res, demora(28), () =>
      json(res, 200, { id: 7, nombre: "Usuario de prueba", plan: "estandar" }),
    );
  },
  "POST /api/pedido": (req, res) => {
    responderCon(res, demora(140), () =>
      json(res, 201, {
        id: Math.floor(Math.random() * 100000),
        estado: "confirmado",
        detalle: catalogo.slice(0, 12),
      }),
    );
  },
  "GET /api/inexistente": (req, res) => {
    responderCon(res, demora(20), () =>
      json(res, 404, { codigo: 404, mensaje: "El recurso solicitado no existe" }),
    );
  },
};

http
  .createServer((req, res) => {
    const clave = `${req.method} ${req.url.split("?")[0]}`;
    const manejador = rutas[clave];

    if (!manejador) {
      return json(res, 404, { codigo: 404, mensaje: "ruta desconocida" });
    }

    if (enVuelo >= COLA_MAXIMA) {
      return json(res, 503, { codigo: 503, mensaje: "Servicio saturado" }, { "retry-after": "2" });
    }

    if (req.method === "POST") {
      let cuerpo = "";
      req.on("data", (parte) => (cuerpo += parte));
      req.on("end", () => manejador(req, res));
      return;
    }
    manejador(req, res);
  })
  .listen(PUERTO, () => {
    console.log(`SUT demo escuchando en http://localhost:${PUERTO}`);
    console.log(`capacidad ${CAPACIDAD} · cola maxima ${COLA_MAXIMA}`);
  });
