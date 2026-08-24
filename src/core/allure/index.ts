/**
 * Decoradores Allure para Playwright.
 *
 * Un único punto de importación para specs de e2e y de API:
 *
 *   import {
 *     TestSuite, Test, Cases, BeforeEach,
 *     Epic, Feature, Story, Severity, Owner, Layer, Tag,
 *     Issue, Tms, Step, SEVERITY, LAYER,
 *   } from "@core/allure";
 */

/* Clasificación y trazabilidad */
export {
  AllureId,
  Description,
  DescriptionHtml,
  DisplayName,
  Epic,
  Feature,
  Flaky,
  Label,
  Layer,
  Owner,
  Parameter,
  ParentSuite,
  Severity,
  Story,
  SubSuite,
  Suite,
  Tag,
} from "./labels";

export { Issue, Link, Requirement, Tms } from "./links";

/* Steps y adjuntos */
export {
  Attach,
  ContentType,
  Step,
  attachHtml,
  attachJson,
  attachText,
  withStep,
} from "./steps";
export type { StepOptions } from "./steps";

/* Declaración de suites y casos */
export {
  AfterAll,
  AfterEach,
  BeforeAll,
  BeforeEach,
  Cases,
  Fail,
  Fixme,
  Only,
  Retries,
  Skip,
  Slow,
  Test,
  TestSuite,
  Timeout,
} from "./runner";

/* Registro del `test` extendido del proyecto */
export { getTest, useTest } from "./test-registry";

/* Tipos y constantes */
export { LAYER, SEVERITY } from "./types";
export type {
  AllureDecorator,
  AllureMeta,
  MethodMarkerDecorator,
  MethodWrapperDecorator,
  SuiteDecorator,
  LabelEntry,
  LinkEntry,
  ParameterEntry,
  ParameterOptions,
  SeverityLevel,
  SuiteExecutionMode,
  SuiteOptions,
  TestLayer,
  TestMode,
  TestOptions,
} from "./types";

/* Re-export de la API funcional de Allure, para lo que no cubre un decorador */
export {
  attachment,
  attachmentPath,
  logStep,
  parameter as allureParameter,
  step as allureStep,
} from "allure-js-commons";
