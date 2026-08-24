import type { Page } from "@playwright/test";

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

  async capturar(): Promise<Buffer> {
    return this.page.screenshot({ fullPage: true });
  }
}
