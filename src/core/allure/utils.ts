/** Utilidades internas del módulo. No forman parte de la API pública. */

/** `addItemToCart` -> `Add item to cart`. */
export function humanize(identifier: string): string {
  const spaced = identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** `LoginSuite` / `login.spec` -> `Login suite`. */
export function humanizeClassName(name: string): string {
  return humanize(name.replace(/(Suite|Tests?|Spec)$/i, "") || name);
}

/**
 * Interpola un título de step.
 *
 * Placeholders soportados:
 *   - `{0}`, `{1}`, ...       -> argumentos posicionales del método
 *   - `{this.propiedad}`      -> propiedad de la instancia
 *   - `{0.propiedad}`         -> propiedad de un argumento
 */
export function renderTitle(template: string, args: unknown[], self: unknown): string {
  return template.replace(/\{([^}]+)\}/g, (match, rawPath: string) => {
    const [head, ...rest] = rawPath.trim().split(".");
    const root = head === "this" ? self : args[Number(head)];
    if (root === undefined && head !== "this") return match;
    const value = rest.reduce<unknown>(
      (acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]),
      root,
    );
    return value === undefined ? match : stringify(value);
  });
}

/** Serializa cualquier valor a algo legible en el reporte, sin explotar. */
export function stringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        return typeof val === "bigint" ? String(val) : val;
      },
      2,
    ) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Recorre la cadena de prototipos de una clase, de la base a la derivada. */
export function classChain(ctor: Function): Function[] {
  const chain: Function[] = [];
  let current: Function | null = ctor;
  while (current && current !== Function.prototype && current.name) {
    chain.unshift(current);
    current = Object.getPrototypeOf(current);
  }
  return chain;
}
