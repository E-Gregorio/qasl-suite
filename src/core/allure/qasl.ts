import type { MethodMarkerDecorator } from "./types";

/**
 * Enlace entre un caso automatizado y su caso en QASL Manual Testing.
 *
 * La referencia es la de NEXUS Requirements: `HU|TS|TC`.
 *
 *   @TestCase("HU-001|TS-01|TC-01")
 *   @Test("el usuario estandar accede al catalogo")
 *
 * Con `@Cases` se pasa una referencia por cada dato del dataset, en el mismo
 * orden; cada variante publica su propio resultado:
 *
 *   @TestCase("HU-001|TS-02|TC-02", "HU-001|TS-02|TC-03")
 *   @Cases(loginsRechazados, ...)
 *
 * El decorador hace dos cosas:
 * - En Allure agrega el link "QASL · HU-001 | TS-01 | TC-01", que abre el caso
 *   en la herramienta (template `qasl` de `playwright.config.ts`).
 * - Marca el test con la anotación `case`, que lee el reporter de QASL para
 *   publicar el resultado en el caso correcto desde el pipeline.
 */
export const QASL_CASE_KEY = Symbol.for("allure.decorators.qasl-case");

const REF = /^[A-Z][\w-]*\|[A-Z][\w-]*\|TC[\w-]+$/i;

export function TestCase(...refs: string[]): MethodMarkerDecorator {
  const clean = refs.map((ref) => ref.replace(/\s+/g, "").toUpperCase());
  for (const ref of clean) {
    if (!REF.test(ref)) {
      throw new Error(`@TestCase("${ref}"): la referencia debe tener la forma HU-001|TS-01|TC-01.`);
    }
  }
  return (value) => {
    Object.defineProperty(value, QASL_CASE_KEY, {
      value: clean,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  };
}

export function readQaslRefs(fn: unknown): string[] {
  return typeof fn === "function" ? ((fn as any)[QASL_CASE_KEY] ?? []) : [];
}

/** Referencia que corresponde a cada variante del caso. */
export function refForVariant(refs: string[], index: number, variants: number, method: string): string | undefined {
  if (!refs.length) return undefined;
  if (refs.length === 1) return refs[0];
  if (refs.length !== variants) {
    throw new Error(
      `@TestCase en ${method}: hay ${refs.length} referencias para ${variants} datos de @Cases. Tiene que haber una por dato.`,
    );
  }
  return refs[index];
}

/** `HU-001|TS-02|TC-03` → clave del caso en QASL (`HU-001-TC-03`) y nombre legible. */
export function qaslLink(ref: string) {
  const parts = ref.split("|");
  return {
    url: `${parts[0]}-${parts[parts.length - 1]}`,
    name: `QASL · ${parts.join(" | ")}`,
    type: "qasl",
  };
}
