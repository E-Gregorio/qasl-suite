/**
 * Tipos públicos del módulo de decoradores Allure.
 *
 * Importante: está escrito contra los DECORADORES ESTÁNDAR (propuesta
 * 2023-05, la que implementa TypeScript 5+ sin `experimentalDecorators`).
 * Es la única variante que ejecuta el runner de Playwright, que compila
 * siempre con `@babel/plugin-proposal-decorators` en versión "2023-05" e
 * ignora la opción `experimentalDecorators` del tsconfig.
 */

/** Niveles de severidad soportados por Allure. */
export type SeverityLevel = "blocker" | "critical" | "normal" | "minor" | "trivial";

/** Constantes de severidad, para evitar strings mágicos en los specs. */
export const SEVERITY = {
  BLOCKER: "blocker",
  CRITICAL: "critical",
  NORMAL: "normal",
  MINOR: "minor",
  TRIVIAL: "trivial",
} as const satisfies Record<string, SeverityLevel>;

/** Capa de la pirámide de testing (label `layer` de Allure). */
export type TestLayer = "e2e" | "api" | "integration" | "unit" | (string & {});

export const LAYER = {
  E2E: "e2e",
  API: "api",
  INTEGRATION: "integration",
  UNIT: "unit",
} as const satisfies Record<string, TestLayer>;

export interface LabelEntry {
  name: string;
  value: string;
}

export interface LinkEntry {
  url: string;
  name?: string;
  type?: string;
}

export interface ParameterOptions {
  /** `masked` oculta el valor, `hidden` lo saca del reporte. */
  mode?: "hidden" | "masked" | "default";
  /** Excluye el parámetro del cálculo del historyId. */
  excluded?: boolean;
}

export interface ParameterEntry {
  name: string;
  value: string;
  options?: ParameterOptions;
}

/** Metadata Allure acumulada por una clase o por un método. */
export interface AllureMeta {
  labels: LabelEntry[];
  links: LinkEntry[];
  parameters: ParameterEntry[];
  description?: string;
  descriptionHtml?: string;
  displayName?: string;
  allureId?: string;
}

/** Modificadores de ejecución de Playwright aplicables a un caso. */
export type TestMode = "default" | "skip" | "only" | "fixme" | "fail" | "slow";

export interface TestOptions {
  mode?: TestMode;
  /** Motivo del skip/fixme; se publica como anotación de Playwright. */
  reason?: string;
  /** Timeout específico del caso, en milisegundos. */
  timeout?: number;
  /** Reintentos específicos del caso (envuelve el test en su propio describe). */
  retries?: number;
  /** Tags nativos de Playwright (`--grep @smoke`). */
  tags?: string[];
}

export type SuiteExecutionMode = "default" | "parallel" | "serial";

export interface SuiteOptions {
  mode?: SuiteExecutionMode;
  retries?: number;
  timeout?: number;
  /**
   * Objeto `test` a usar para registrar los casos. Si se omite se usa el que
   * haya sido registrado con `useTest()`, o el `test` base de Playwright.
   */
  test?: unknown;
}

/* ------------------------------------------------------------------ */
/* Firmas de decoradores (API estándar)                                */
/* ------------------------------------------------------------------ */

/** Decorador aplicable tanto a una clase como a un método. */
export interface AllureDecorator {
  (value: Function, context: ClassDecoratorContext): void;
  (value: Function, context: ClassMethodDecoratorContext): void;
}

/** Decorador de método que no reemplaza la implementación. */
export type MethodMarkerDecorator = (
  value: Function,
  context: ClassMethodDecoratorContext,
) => void;

/** Decorador de método que envuelve la implementación (`@Step`, `@Attach`). */
export type MethodWrapperDecorator = (
  value: any,
  context: ClassMethodDecoratorContext,
) => any;

/** Decorador de clase. */
export type SuiteDecorator = (value: Function, context: ClassDecoratorContext) => void;
