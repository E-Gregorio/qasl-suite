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
  tc: "TC-02" | "TC-03" | "TC-04";
  datos: DatosComprador;
  mensajeEsperado: string;
}

export const formulariosIncompletos: FormularioIncompleto[] = [
  {
    tc: "TC-02",
    datos: { ...compradorValido, nombre: "" },
    mensajeEsperado: CheckoutMessages.nombreRequerido,
  },
  {
    tc: "TC-03",
    datos: { ...compradorValido, apellido: "" },
    mensajeEsperado: CheckoutMessages.apellidoRequerido,
  },
  {
    tc: "TC-04",
    datos: { ...compradorValido, codigoPostal: "" },
    mensajeEsperado: CheckoutMessages.codigoPostalRequerido,
  },
];
