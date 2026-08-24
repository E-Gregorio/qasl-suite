import { LabelName } from "allure-js-commons";
import { metaDecorator, pushLabel } from "./metadata";
import type { AllureDecorator, ParameterOptions, SeverityLevel, TestLayer } from "./types";

/**
 * Decoradores de clasificación. Todos funcionan sobre la clase (aplican a
 * toda la suite) y sobre el método (aplican sólo a ese caso). Lo declarado
 * en el método pisa lo declarado en la clase.
 *
 *   @Epic("Checkout")
 *   @Feature("Carrito")
 *   class CartSuite {
 *     @Story("Agregar producto")
 *     @Severity(SEVERITY.CRITICAL)
 *     @Test("agrega un producto al carrito")
 *     async addItem({ page }) { ... }
 *   }
 */

/** Agrupador de máximo nivel del reporte (Behaviors). */
export const Epic = (name: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.EPIC, name));

/** Funcionalidad dentro del epic. */
export const Feature = (name: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.FEATURE, name));

/** Historia de usuario dentro de la feature. */
export const Story = (name: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.STORY, name));

/** Criticidad del caso: blocker | critical | normal | minor | trivial. */
export const Severity = (level: SeverityLevel): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.SEVERITY, level));

/** Responsable del caso o de la suite. */
export const Owner = (name: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.OWNER, name));

/** Capa de la pirámide: e2e, api, integration, unit. */
export const Layer = (layer: TestLayer): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.LAYER, layer));

/** Jerarquía clásica del reporte (pestaña Suites). */
export const ParentSuite = (name: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.PARENT_SUITE, name));

export const Suite = (name: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.SUITE, name));

export const SubSuite = (name: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.SUB_SUITE, name));

/** Tags de Allure (filtrables en el reporte). Acepta varios de una. */
export const Tag = (...values: string[]): AllureDecorator =>
  metaDecorator((meta) => {
    for (const value of values) pushLabel(meta, LabelName.TAG, value);
  });

/** Marca el caso como conocido-inestable, sin dejar de ejecutarlo. */
export const Flaky = (): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, LabelName.TAG, "flaky"));

/** Label arbitrario, para taxonomías propias del equipo. */
export const Label = (name: string, value: string): AllureDecorator =>
  metaDecorator((meta) => pushLabel(meta, name, value));

/** Descripción en Markdown que se muestra en la ficha del caso. */
export const Description = (markdown: string): AllureDecorator =>
  metaDecorator((meta) => {
    meta.description = markdown;
  });

export const DescriptionHtml = (html: string): AllureDecorator =>
  metaDecorator((meta) => {
    meta.descriptionHtml = html;
  });

/** Reemplaza el título mostrado en el reporte sin tocar el del runner. */
export const DisplayName = (name: string): AllureDecorator =>
  metaDecorator((meta) => {
    meta.displayName = name;
  });

/** ID de Allure TestOps, para el matcheo contra el test case remoto. */
export const AllureId = (id: string): AllureDecorator =>
  metaDecorator((meta) => {
    meta.allureId = id;
    pushLabel(meta, LabelName.ALLURE_ID, id);
  });

/**
 * Parámetro fijo del caso. Útil para dejar registrado el entorno, el
 * navegador o el dataset con el que corrió.
 *
 *   @Parameter("password", "hunter2", { mode: "masked" })
 */
export const Parameter = (
  name: string,
  value: unknown,
  options?: ParameterOptions,
): AllureDecorator =>
  metaDecorator((meta) => {
    meta.parameters.push({
      name,
      value: typeof value === "string" ? value : JSON.stringify(value),
      options,
    });
  });
