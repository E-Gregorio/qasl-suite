/**
 * Playwright decide qué fixtures instanciar leyendo la firma de la función
 * que se le pasa: el primer parámetro tiene que ser un patrón de
 * destructuring literal. Un wrapper genérico `(fixtures, testInfo) => ...`
 * es rechazado con "First argument must use the object destructuring
 * pattern".
 *
 * Por eso el runner lee la firma del método de la clase y genera un wrapper
 * con exactamente el mismo destructuring. El análisis replica el que hace
 * Playwright internamente, así que lo que él acepta, esto lo acepta.
 */

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function filterOutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Separa por comas de primer nivel, ignorando las anidadas en {} y []. */
function splitByComma(source: string): string[] {
  const result: string[] = [];
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
    } else if (char === stack[stack.length - 1]) {
      stack.pop();
    } else if (!stack.length && char === ",") {
      const token = source.substring(start, i).trim();
      if (token) result.push(token);
      start = i + 1;
    }
  }
  const last = source.substring(start).trim();
  if (last) result.push(last);
  return result;
}

/**
 * Nombres de fixtures declarados en el parámetro `paramIndex` de `fn`.
 * Devuelve `[]` si ese parámetro no existe o no es un destructuring.
 */
export function fixtureNamesOf(fn: unknown, paramIndex = 0): string[] {
  if (typeof fn !== "function") return [];
  const text = filterOutComments(fn.toString());
  const match = text.match(/(?:async)?(?:\s+function)?[^(]*\(([^)]*)/);
  if (!match) return [];

  const params = splitByComma(match[1].trim());
  const target = params[paramIndex];
  if (!target || target[0] !== "{" || target[target.length - 1] !== "}") return [];

  return splitByComma(target.substring(1, target.length - 1))
    .map((prop) => {
      const colon = prop.indexOf(":");
      const key = colon === -1 ? prop : prop.substring(0, colon);
      return key.split("=")[0].trim();
    })
    .filter((name) => IDENTIFIER.test(name));
}

/** Une varias listas de fixtures sin repetir, respetando el orden. */
export function mergeFixtureNames(lists: string[][]): string[] {
  const seen = new Set<string>();
  for (const list of lists) for (const name of list) seen.add(name);
  return [...seen];
}

/**
 * Genera una función con la firma `({ a, b }, testInfo)` que delega en
 * `run(fixtures, testInfo)`. Es lo que se le entrega a Playwright.
 */
export function withFixtureSignature(
  names: string[],
  run: (fixtures: any, testInfo: any) => unknown,
): (...args: any[]) => Promise<any> {
  const safe = names.filter((name) => IDENTIFIER.test(name));
  const pattern = safe.length ? `{ ${safe.join(", ")} }` : "{}";
  const factory = new Function(
    "run",
    `return async function (${pattern}, testInfo) { return await run(${pattern}, testInfo); };`,
  ) as (run: unknown) => (...args: any[]) => Promise<any>;
  return factory(run);
}
