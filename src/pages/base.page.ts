import type { Page } from "@playwright/test";
import { ContentType, attachment } from "@core/allure";

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async abrir(ruta: string): Promise<void> {
    await this.page.goto(ruta);
  }

  protected async completar(selector: string, valor: string): Promise<void> {
    await this.page.fill(selector, valor);
  }

  protected async presionar(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  protected async texto(selector: string): Promise<string> {
    return (await this.page.textContent(selector))?.trim() ?? "";
  }

  protected async evidencia(nombre: string): Promise<void> {
    await attachment(nombre, await this.page.screenshot({ fullPage: false }), ContentType.PNG);
  }
}
