import { ContentType, attachment, step } from "allure-js-commons";
import { carryDecoratorMeta } from "./metadata";
import type { MethodWrapperDecorator } from "./types";
import { humanize, renderTitle, stringify } from "./utils";

export interface StepOptions {
  /**
   * Publica los argumentos del método como parámetros del step.
   * Si es un array de strings, se usan como nombres de esos parámetros.
   */
  params?: boolean | string[];
  /** Nombres de parámetros cuyo valor se enmascara en el reporte. */
  mask?: string[];
}

/**
 * Convierte un método en un step de Allure.
 *
 * Pensado para page objects, helpers y clientes de API: cada llamada queda
 * anidada en el árbol del reporte, con su duración y su estado.
 *
 *   class LoginPage {
 *     @Step('Iniciar sesión como "{0}"')
 *     async login(user: string, password: string) { ... }
 *
 *     @Step()                       // -> "Submit form"
 *     async submitForm() { ... }
 *   }
 *
 * Placeholders del título: `{0}`, `{1}`, `{0.email}`, `{this.url}`.
 *
 * El método decorado siempre devuelve una promesa, así que hay que
 * await-earlo aunque el original fuese síncrono.
 */
export function Step(title?: string, options: StepOptions = {}): MethodWrapperDecorator {
  return (value: any, context: ClassMethodDecoratorContext) => {
    if (typeof value !== "function") return value;

    const template = title ?? humanize(String(context.name));
    const masked = new Set(options.mask ?? []);

    function wrapped(this: unknown, ...args: unknown[]) {
      const name = renderTitle(template, args, this);
      return step(name, async (ctx) => {
        if (options.params) {
          const names = Array.isArray(options.params) ? options.params : [];
          for (let i = 0; i < args.length; i++) {
            const paramName = names[i] ?? `arg${i}`;
            await ctx.parameter(
              paramName,
              stringify(args[i]),
              masked.has(paramName) ? "masked" : undefined,
            );
          }
        }
        return await value.apply(this, args);
      });
    }

    Object.defineProperty(wrapped, "name", { value: String(context.name), configurable: true });
    carryDecoratorMeta(value, wrapped);
    return wrapped;
  };
}

/**
 * Adjunta al reporte el valor devuelto por el método.
 *
 *   @Attach("Respuesta de /users")
 *   async fetchUsers() { return await this.api.get("/users"); }
 */
export function Attach(
  name?: string,
  contentType: ContentType | string = ContentType.JSON,
): MethodWrapperDecorator {
  return (value: any, context: ClassMethodDecoratorContext) => {
    if (typeof value !== "function") return value;

    const attachmentName = name ?? humanize(String(context.name));

    async function wrapped(this: unknown, ...args: unknown[]) {
      const result = await value.apply(this, args);
      const content =
        typeof result === "string" || Buffer.isBuffer(result) ? result : stringify(result);
      await attachment(attachmentName, content as string | Buffer, contentType);
      return result;
    }

    Object.defineProperty(wrapped, "name", { value: String(context.name), configurable: true });
    carryDecoratorMeta(value, wrapped);
    return wrapped;
  };
}

/* ------------------------------------------------------------------ */
/* Helpers de uso directo dentro de un test, sin decorador             */
/* ------------------------------------------------------------------ */

/** Ejecuta un bloque como step con nombre. Equivalente funcional de `@Step`. */
export const withStep = step;

export const attachJson = (name: string, data: unknown): PromiseLike<void> =>
  attachment(name, stringify(data), ContentType.JSON);

export const attachText = (name: string, text: string): PromiseLike<void> =>
  attachment(name, text, ContentType.TEXT);

export const attachHtml = (name: string, html: string): PromiseLike<void> =>
  attachment(name, html, ContentType.HTML);

export { ContentType };
