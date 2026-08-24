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
  links: {
    issueUrlTemplate: read("ISSUE_URL_TEMPLATE"),
    tmsUrlTemplate: read("TMS_URL_TEMPLATE"),
  },
} as const;
