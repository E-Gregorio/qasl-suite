import { env } from "@core/config/env";
import { LoginMessages } from "@data/messages.data";

export interface LoginAttempt {
  caso: string;
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
    caso: "usuario bloqueado",
    usuario: env.users.lockedOut,
    password: env.passwords.valid,
    mensajeEsperado: LoginMessages.usuarioBloqueado,
  },
  {
    caso: "password incorrecta",
    usuario: env.users.standard,
    password: env.passwords.invalid,
    mensajeEsperado: LoginMessages.credencialesInvalidas,
  },
  {
    caso: "usuario inexistente",
    usuario: env.users.unknown,
    password: env.passwords.valid,
    mensajeEsperado: LoginMessages.credencialesInvalidas,
  },
  {
    caso: "usuario vacio",
    usuario: "",
    password: env.passwords.valid,
    mensajeEsperado: LoginMessages.usuarioRequerido,
  },
  {
    caso: "password vacia",
    usuario: env.users.standard,
    password: "",
    mensajeEsperado: LoginMessages.passwordRequerida,
  },
];
