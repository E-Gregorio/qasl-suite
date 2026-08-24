import { env } from "@core/config/env";
import { CheckoutMessages } from "@data/messages.data";

export interface DatosComprador {
  nombre: string;
  apellido: string;
  codigoPostal: string;
}

export const compradorValido: DatosComprador = {
  nombre: env.checkout.firstName,
  apellido: env.checkout.lastName,
  codigoPostal: env.checkout.postalCode,
};

export interface FormularioIncompleto {
  caso: string;
  datos: DatosComprador;
  mensajeEsperado: string;
}

export const formulariosIncompletos: FormularioIncompleto[] = [
  {
    caso: "sin nombre",
    datos: { ...compradorValido, nombre: "" },
    mensajeEsperado: CheckoutMessages.nombreRequerido,
  },
  {
    caso: "sin apellido",
    datos: { ...compradorValido, apellido: "" },
    mensajeEsperado: CheckoutMessages.apellidoRequerido,
  },
  {
    caso: "sin codigo postal",
    datos: { ...compradorValido, codigoPostal: "" },
    mensajeEsperado: CheckoutMessages.codigoPostalRequerido,
  },
];
