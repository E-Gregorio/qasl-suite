import {
  LabelName,
  allureId as setAllureId,
  description as setDescription,
  descriptionHtml as setDescriptionHtml,
  displayName as setDisplayName,
  labels as setLabels,
  links as setLinks,
  parameter as setParameter,
} from "allure-js-commons";
import { CASE_KEY, HOOK_KEY, normalizeLabels, resolveMeta } from "./metadata";
import { getTest } from "./test-registry";
import type {
  AllureMeta,
  MethodMarkerDecorator,
  SuiteDecorator,
  SuiteOptions,
  TestOptions,
} from "./types";
import { fixtureNamesOf, mergeFixtureNames, withFixtureSignature } from "./signature";
import { classChain, humanize, humanizeClassName, stringify } from "./utils";

/* ------------------------------------------------------------------ */
/* Definición de casos y hooks (adherida a la función del método)      */
/* ------------------------------------------------------------------ */

interface TestCaseDef {
  method: string;
  /** Sólo `@Test` y `@Cases` declaran un caso; los modificadores no. */
  declared: boolean;
  title?: string;
  options: TestOptions;
  cases?: unknown[];
  caseTitle?: (data: any, index: number) => string;
}

type HookKind = "beforeAll" | "beforeEach" | "afterEach" | "afterAll";

function caseDef(fn: Function): TestCaseDef {
  const holder = fn as Function & { [CASE_KEY]?: TestCaseDef };
  if (!holder[CASE_KEY]) {
    Object.defineProperty(fn, CASE_KEY, {
      value: { method: "", declared: false, options: {} } as TestCaseDef,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  return holder[CASE_KEY]!;
}

function readCaseDef(fn: unknown): TestCaseDef | undefined {
  return typeof fn === "function" ? (fn as any)[CASE_KEY] : undefined;
}

function readHook(fn: unknown): HookKind | undefined {
  return typeof fn === "function" ? (fn as any)[HOOK_KEY] : undefined;
}

/**
 * Recorre la cadena de prototipos y devuelve los casos en orden de
 * declaración. Un método redefinido en la subclase conserva la posición del
 * original, que es lo que uno espera al leer el archivo.
 */
function collectCases(ctor: Function): TestCaseDef[] {
  const merged = new Map<string, TestCaseDef>();
  for (const klass of classChain(ctor)) {
    for (const name of Object.getOwnPropertyNames(klass.prototype)) {
      if (name === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(klass.prototype, name);
      const def = readCaseDef(descriptor?.value);
      if (def?.declared) merged.set(name, { ...def, method: name });
    }
  }
  return [...merged.values()];
}

function collectHooks(ctor: Function): Record<HookKind, string[]> {
  const hooks: Record<HookKind, string[]> = {
    beforeAll: [],
    beforeEach: [],
    afterEach: [],
    afterAll: [],
  };
  const seen = new Set<string>();
  for (const klass of classChain(ctor)) {
    for (const name of Object.getOwnPropertyNames(klass.prototype)) {
      if (name === "constructor" || seen.has(name)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(klass.prototype, name);
      const kind = readHook(descriptor?.value);
      if (!kind) continue;
      seen.add(name);
      hooks[kind].push(name);
    }
  }
  return hooks;
}

/* ------------------------------------------------------------------ */
/* Decoradores de casos                                                */
/* ------------------------------------------------------------------ */

/**
 * Declara un método como caso de prueba.
 *
 *   @Test("el usuario puede iniciar sesión")
 *   async login({ page }: Fixtures) { ... }
 *
 * El método recibe los fixtures como primer argumento y el `TestInfo` como
 * segundo. Si además lleva `@Cases`, el primer argumento pasa a ser el dato
 * del dataset, y los fixtures y el `TestInfo` corren un lugar.
 */
export function Test(title?: string, options: TestOptions = {}): MethodMarkerDecorator {
  return (value, context) => {
    const def = caseDef(value);
    def.method = String(context.name);
    def.declared = true;
    if (title !== undefined) def.title = title;
    def.options = { ...def.options, ...options };
  };
}

/**
 * Data-driven testing: genera un caso por cada elemento del dataset.
 *
 *   @Cases(usuarios, (u) => `login inválido: ${u.caso}`)
 *   @Test()
 *   async loginInvalido(data: Usuario, { page }: Fixtures) { ... }
 *
 * Cada dato se publica como parámetro del caso, así que Allure trata las
 * variantes como casos distintos, con su propio historial.
 */
export function Cases<T>(
  data: readonly T[],
  titleFn?: (item: T, index: number) => string,
): MethodMarkerDecorator {
  return (value, context) => {
    const def = caseDef(value);
    def.method = String(context.name);
    def.declared = true;
    def.cases = [...data];
    def.caseTitle = titleFn as TestCaseDef["caseTitle"];
  };
}

const modeDecorator =
  (mode: NonNullable<TestOptions["mode"]>) =>
  (reason?: string): MethodMarkerDecorator =>
  (value, context) => {
    const def = caseDef(value);
    def.method = String(context.name);
    def.options.mode = mode;
    if (reason) def.options.reason = reason;
  };

/** No ejecuta el caso. Queda como `skipped` en el reporte. */
export const Skip = modeDecorator("skip");
/** Caso pendiente de arreglo: no se ejecuta y queda documentado. */
export const Fixme = modeDecorator("fixme");
/** Se espera que falle: si pasa, el reporte lo marca como error. */
export const Fail = modeDecorator("fail");
/** Triplica el timeout del caso. */
export const Slow = modeDecorator("slow");
/** Ejecuta únicamente este caso. Nunca dejarlo commiteado. */
export const Only = modeDecorator("only");

/** Timeout propio del caso, en milisegundos. */
export const Timeout =
  (ms: number): MethodMarkerDecorator =>
  (value, context) => {
    const def = caseDef(value);
    def.method = String(context.name);
    def.options.timeout = ms;
  };

/**
 * Reintentos propios del caso. Playwright sólo permite configurar reintentos
 * por bloque, así que el caso se envuelve en su propio `describe` y aparece
 * un nivel extra en la jerarquía. Para evitarlo, configurar los reintentos a
 * nivel suite: `@TestSuite("...", { retries: 2 })`.
 */
export const Retries =
  (count: number): MethodMarkerDecorator =>
  (value, context) => {
    const def = caseDef(value);
    def.method = String(context.name);
    def.options.retries = count;
  };

const hookDecorator =
  (kind: HookKind) =>
  (): MethodMarkerDecorator =>
  (value) => {
    Object.defineProperty(value, HOOK_KEY, {
      value: kind,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  };

/** Se ejecuta una vez antes de todos los casos de la suite. */
export const BeforeAll = hookDecorator("beforeAll");
/** Se ejecuta antes de cada caso, sobre la instancia de ese caso. */
export const BeforeEach = hookDecorator("beforeEach");
/** Se ejecuta después de cada caso. */
export const AfterEach = hookDecorator("afterEach");
/** Se ejecuta una vez al terminar la suite. */
export const AfterAll = hookDecorator("afterAll");

/* ------------------------------------------------------------------ */
/* Aplicación de la metadata en tiempo de ejecución                    */
/* ------------------------------------------------------------------ */

async function applyMeta(meta: AllureMeta, data: unknown, hasData: boolean): Promise<void> {
  // Los tags con "@" viajan como tags nativos de Playwright y el reporter ya
  // los publica como tags de Allure: si además los mandáramos acá saldrían
  // duplicados ("@smoke" y "smoke").
  const labels = normalizeLabels(meta.labels).filter(
    (label) => !(label.name === LabelName.TAG && label.value.startsWith("@")),
  );
  if (labels.length) await setLabels(...labels);
  if (meta.links.length) await setLinks(...meta.links);
  if (meta.displayName) await setDisplayName(meta.displayName);
  if (meta.description) await setDescription(meta.description);
  if (meta.descriptionHtml) await setDescriptionHtml(meta.descriptionHtml);
  if (meta.allureId) await setAllureId(meta.allureId);

  for (const param of meta.parameters) {
    await setParameter(param.name, param.value, param.options);
  }

  if (!hasData) return;
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      await setParameter(key, stringify(value));
    }
  } else {
    await setParameter("dataset", stringify(data));
  }
}

/* ------------------------------------------------------------------ */
/* @TestSuite: materializa la clase como suite de Playwright           */
/* ------------------------------------------------------------------ */

/**
 * Convierte la clase en un `test.describe` de Playwright y registra cada
 * método `@Test` como caso, aplicando la metadata Allure heredada.
 *
 *   @Epic("Checkout")
 *   @Layer(LAYER.E2E)
 *   @TestSuite("Carrito de compras")
 *   export class CartSuite { ... }
 *
 * El registro se difiere con `context.addInitializer`, que corre cuando la
 * clase ya está completamente definida. Gracias a eso el orden de los
 * decoradores es indistinto: `@TestSuite` puede ir arriba o abajo de
 * `@Epic`, `@Feature`, etc., y siempre ve toda la metadata.
 *
 * Todo esto ocurre al cargar el módulo, que es cuando Playwright recolecta
 * los tests: alcanza con que el archivo sea un `*.spec.ts`.
 */
export function TestSuite(title?: string, options: SuiteOptions = {}): SuiteDecorator {
  return function suiteDecorator(_value: Function, context: ClassDecoratorContext): void {
    context.addInitializer(function registerSuite(this: unknown) {
      declareSuite(this as Function, title, options);
    });
  };
}

function declareSuite(ctor: Function, title: string | undefined, options: SuiteOptions): void {
  const test = (options.test ?? getTest()) as any;
  const suiteTitle = title ?? humanizeClassName(ctor.name);
  const cases = collectCases(ctor);
  const hooks = collectHooks(ctor);

  if (!cases.length) return;

  const Ctor = ctor as unknown as new () => any;

  test.describe(suiteTitle, () => {
    const configure: Record<string, unknown> = {};
    if (options.mode && options.mode !== "default") configure.mode = options.mode;
    if (options.retries !== undefined) configure.retries = options.retries;
    if (options.timeout !== undefined) configure.timeout = options.timeout;
    if (Object.keys(configure).length) test.describe.configure(configure);

    // Una instancia por caso: el estado no se filtra entre tests. Dentro de
    // un worker los tests de un archivo corren en serie, así que esta
    // variable de closure es segura incluso con fullyParallel.
    let current: any = null;

    const hookFixtures = (names: string[]): string[] =>
      mergeFixtureNames(
        names.map((hook) => fixtureNamesOf((ctor.prototype as Record<string, unknown>)[hook])),
      );

    if (hooks.beforeAll.length) {
      test.beforeAll(
        withFixtureSignature(hookFixtures(hooks.beforeAll), async (fixtures, testInfo) => {
          const shared = new Ctor();
          for (const hook of hooks.beforeAll) await shared[hook](fixtures, testInfo);
        }),
      );
    }

    test.beforeEach(
      withFixtureSignature(hookFixtures(hooks.beforeEach), async (fixtures, testInfo) => {
        current = new Ctor();
        current.fixtures = fixtures;
        current.testInfo = testInfo;
        for (const hook of hooks.beforeEach) await current[hook](fixtures, testInfo);
      }),
    );

    if (hooks.afterEach.length) {
      test.afterEach(
        withFixtureSignature(hookFixtures(hooks.afterEach), async (fixtures, testInfo) => {
          for (const hook of hooks.afterEach) await current?.[hook](fixtures, testInfo);
        }),
      );
    }

    if (hooks.afterAll.length) {
      test.afterAll(
        withFixtureSignature(hookFixtures(hooks.afterAll), async (fixtures, testInfo) => {
          const shared = new Ctor();
          for (const hook of hooks.afterAll) await shared[hook](fixtures, testInfo);
        }),
      );
    }

    for (const def of cases) {
      registerCase(test, ctor, def, () => current);
    }
  });
}

function registerCase(test: any, ctor: Function, def: TestCaseDef, getInstance: () => any): void {
  const meta = resolveMeta(ctor, def.method);
  const baseTitle = def.title ?? humanize(def.method);

  // Los tags Allure que empiezan con "@" se propagan como tags nativos de
  // Playwright, para poder filtrar con `--grep @smoke`.
  const pwTags = [
    ...(def.options.tags ?? []),
    ...meta.labels
      .filter((label) => label.name === LabelName.TAG && label.value.startsWith("@"))
      .map((label) => label.value),
  ].filter((tag, index, all) => all.indexOf(tag) === index);

  const hasData = Array.isArray(def.cases);
  const variants = hasData
    ? def.cases!.map((data, index) => ({
        data,
        index,
        title: def.caseTitle ? def.caseTitle(data, index) : `${baseTitle} [${index + 1}]`,
      }))
    : [{ data: undefined as unknown, index: 0, title: baseTitle }];

  const fixtureNames = fixtureNamesOf(
    (ctor.prototype as Record<string, unknown>)[def.method],
    hasData ? 1 : 0,
  );

  for (const variant of variants) {
    const body = withFixtureSignature(fixtureNames, async (fixtures: any, testInfo: any) => {
      if (def.options.mode === "slow") testInfo.slow();
      if (def.options.mode === "fail") test.fail();
      if (def.options.timeout !== undefined) testInfo.setTimeout(def.options.timeout);

      await applyMeta(meta, variant.data, hasData);

      const instance = getInstance();
      return hasData
        ? await instance[def.method](variant.data, fixtures, testInfo)
        : await instance[def.method](fixtures, testInfo);
    });

    const details: Record<string, unknown> = {};
    if (pwTags.length) details.tag = pwTags;
    if (def.options.reason) {
      details.annotation = [{ type: def.options.mode ?? "note", description: def.options.reason }];
    }

    const declare = (): void => {
      const args: any[] = Object.keys(details).length
        ? [variant.title, details, body]
        : [variant.title, body];
      // Nota: en skip y fixme el cuerpo nunca se ejecuta, así que Playwright
      // no entrega datos de runtime para esos casos. En el reporte conservan
      // título, tags, suite y el motivo del skip, pero no epic/feature/
      // severity. Es una limitación del runner, no del reporter.
      switch (def.options.mode) {
        case "skip":
          test.skip(...args);
          break;
        case "fixme":
          test.fixme(...args);
          break;
        case "only":
          test.only(...args);
          break;
        default:
          test(...args);
      }
    };

    if (def.options.retries !== undefined) {
      test.describe(variant.title, () => {
        test.describe.configure({ retries: def.options.retries });
        declare();
      });
    } else {
      declare();
    }
  }
}
