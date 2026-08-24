import { sleep } from "k6";
import { entorno } from "../config/entorno.js";
import { perfilDe } from "../config/perfiles.js";
import { thresholdsDeK6 } from "../config/umbrales.js";
import { llamar } from "../lib/cliente.js";
import { resumen } from "../adaptador/resumen.js";

const perfil = perfilDe(entorno.tipoDePrueba);

export const options = {
  stages: perfil.etapas,
  thresholds: thresholdsDeK6(),
  summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
  discardResponseBodies: false,
};

export default function () {
  llamar("login", { usuario: "usuario_de_prueba", clave: "secreto" });
  sleep(0.3);

  llamar("catalogo");
  sleep(0.2);

  llamar("perfil");
  sleep(0.2);

  llamar("pedido", { items: [{ producto: 1, cantidad: 2 }], envio: "estandar" });
  sleep(0.3);

  llamar("inexistente");
  sleep(0.5);
}

export function handleSummary(datos) {
  return resumen(datos, perfil);
}
