import { config } from "dotenv";

config();

const read = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${key}. Copiá .env.example a .env`);
  }
  return value;
};

export const env = {
  name: read("ENV_NAME"),
  baseUrl: read("BASE_URL"),
  apiBaseUrl: read("API_BASE_URL"),
  users: {
    standard: read("USER_STANDARD"),
    lockedOut: read("USER_LOCKED_OUT"),
    problem: read("USER_PROBLEM"),
    performanceGlitch: read("USER_PERFORMANCE_GLITCH"),
    unknown: read("USER_UNKNOWN"),
  },
  passwords: {
    valid: read("PASSWORD_VALID"),
    invalid: read("PASSWORD_INVALID"),
  },
  checkout: {
    firstName: read("CHECKOUT_FIRST_NAME"),
    lastName: read("CHECKOUT_LAST_NAME"),
    postalCode: read("CHECKOUT_POSTAL_CODE"),
  },
  evidencia: {
    video: read("VIDEO") as "on" | "off" | "retain-on-failure",
    pantalla: {
      width: Number(read("PANTALLA_ANCHO")),
      height: Number(read("PANTALLA_ALTO")),
    },
  },
  qasl: {
    url: process.env.QASL_URL,
    token: process.env.QASL_TOKEN,
    project: read("QASL_PROJECT"),
    plan: read("QASL_PLAN"),
    webUrl: read("QASL_WEB_URL"),
  },
} as const;
