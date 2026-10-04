import { env } from "@core/config/env";
import { LoginMessages } from "@data/messages.data";

export interface LoginAttempt {
  tc: "TC-02" | "TC-03" | "TC-04" | "TC-05" | "TC-06";
  usuario: string;
  password: string;
  mensajeEsperado: string;
}

export const usuarioValido = {
  usuario: env.users.standard,
  password: env.passwords.valid,
} as const;

export const loginsRechazados: LoginAttempt[] = [
  {
    tc: "TC-02",
    usuario: env.users.lockedOut,
    password: env.passwords.valid,
    mensajeEsperado: LoginMessages.usuarioBloqueado,
  },
  {
    tc: "TC-03",
    usuario: env.users.standard,
    password: env.passwords.invalid,
    mensajeEsperado: LoginMessages.credencialesInvalidas,
  },
  {
    tc: "TC-04",
    usuario: env.users.unknown,
    password: env.passwords.valid,
    mensajeEsperado: LoginMessages.credencialesInvalidas,
  },
  {
    tc: "TC-05",
    usuario: "",
    password: env.passwords.valid,
    mensajeEsperado: LoginMessages.usuarioRequerido,
  },
  {
    tc: "TC-06",
    usuario: env.users.standard,
    password: "",
    mensajeEsperado: LoginMessages.passwordRequerida,
  },
];
