import http from "k6/http";
import { check } from "k6";
import { entorno } from "../config/entorno.js";

const respuestasEsperadas = {
  login: [200],
  catalogo: [200],
  perfil: [200],
  pedido: [201],
  inexistente: [404],
};

export const endpoints = {
  login: { metodo: "POST", ruta: "/api/login" },
  catalogo: { metodo: "GET", ruta: "/api/catalogo" },
  perfil: { metodo: "GET", ruta: "/api/perfil" },
  pedido: { metodo: "POST", ruta: "/api/pedido" },
  inexistente: { metodo: "GET", ruta: "/api/inexistente" },
};

export const llamar = (nombre, cuerpo) => {
  const definicion = endpoints[nombre];
  const esperados = respuestasEsperadas[nombre] ?? [200];

  const parametros = {
    tags: { name: nombre },
    headers: { "content-type": "application/json", accept: "application/json" },
    responseCallback: http.expectedStatuses(...esperados),
  };

  const url = `${entorno.baseUrl}${definicion.ruta}`;
  const respuesta =
    definicion.metodo === "GET"
      ? http.get(url, parametros)
      : http.request(definicion.metodo, url, JSON.stringify(cuerpo ?? {}), parametros);

  check(respuesta, {
    [`${nombre} responde con el codigo esperado`]: (r) => esperados.includes(r.status),
    [`${nombre} devuelve un cuerpo`]: (r) => r.body !== null && r.body.length > 0,
  });

  return respuesta;
};
