import { LinkType } from "allure-js-commons";
import { metaDecorator } from "./metadata";
import type { AllureDecorator } from "./types";

/**
 * Decoradores de trazabilidad.
 *
 * `@Issue` y `@Tms` reciben el identificador pelado (`"BUG-1234"`,
 * `"TC-88"`). La URL final la arma el reporter con los templates definidos
 * en `playwright.config.ts`:
 *
 *   ["allure-playwright", {
 *     links: {
 *       issue: { urlTemplate: "https://jira.empresa.com/browse/%s", nameTemplate: "%s" },
 *       tms:   { urlTemplate: "https://testops.empresa.com/case/%s", nameTemplate: "TC %s" },
 *     },
 *   }]
 *
 * Si se pasa una URL completa, el reporter la respeta tal cual.
 */

/** Link genérico. */
export const Link = (url: string, name?: string, type: string = LinkType.DEFAULT): AllureDecorator =>
  metaDecorator((meta) => {
    meta.links.push({ url, name, type });
  });

/** Defecto asociado (Jira, Azure Boards, GitHub Issues). */
export const Issue = (id: string, name?: string): AllureDecorator =>
  metaDecorator((meta) => {
    meta.links.push({ url: id, name: name ?? id, type: LinkType.ISSUE });
  });

/** Caso de prueba en el TMS (Allure TestOps, Xray, TestRail, Zephyr). */
export const Tms = (id: string, name?: string): AllureDecorator =>
  metaDecorator((meta) => {
    meta.links.push({ url: id, name: name ?? id, type: LinkType.TMS });
  });

/** Requerimiento o especificación de origen. */
export const Requirement = (id: string, name?: string): AllureDecorator =>
  metaDecorator((meta) => {
    meta.links.push({ url: id, name: name ?? id, type: "requirement" });
  });
