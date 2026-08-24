import { test as playwrightTest } from "@playwright/test";

let activeTest: unknown = playwrightTest;

/**
 * Registra el objeto `test` que usarán `@TestSuite` y `@Test` para declarar
 * los casos. Se llama una sola vez, en el archivo de fixtures del proyecto:
 *
 *   // src/fixtures/test.ts
 *   import { test as base } from "@playwright/test";
 *   import { useTest } from "../allure";
 *
 *   export const test = base.extend<MisFixtures>({ ... });
 *   export const expect = base.expect;
 *   useTest(test);
 *
 * Como los imports se evalúan antes que el cuerpo del módulo, cualquier spec
 * que importe desde ese archivo ya tiene el `test` extendido registrado
 * cuando se ejecutan los decoradores.
 *
 * Alternativa explícita: `@TestSuite("...", { test })`.
 */
export function useTest<T>(test: T): T {
  activeTest = test;
  return test;
}

/** Devuelve el `test` activo (el extendido, o el base de Playwright). */
export function getTest(): any {
  return activeTest;
}
