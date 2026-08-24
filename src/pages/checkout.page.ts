import { expect } from "@playwright/test";
import { Step } from "@core/allure";
import { CheckoutLocators } from "@locators/checkout.locators";
import { BasePage } from "@pages/base.page";
import type { DatosComprador } from "@data/checkout.data";

export class CheckoutPage extends BasePage {
  @Step('Completar los datos del comprador "{0.nombre} {0.apellido}"')
  async completarDatos(datos: DatosComprador): Promise<void> {
    await this.completar(CheckoutLocators.firstName, datos.nombre);
    await this.completar(CheckoutLocators.lastName, datos.apellido);
    await this.completar(CheckoutLocators.postalCode, datos.codigoPostal);
    await this.presionar(CheckoutLocators.continue);
  }

  @Step('Verificar mensaje de validacion "{0}"')
  async verificarValidacion(mensajeEsperado: string): Promise<void> {
    await expect(this.page.locator(CheckoutLocators.error)).toHaveText(mensajeEsperado);
  }

  @Step("Verificar el total del pedido")
  async verificarTotal(subtotalEsperado: number, tasa: number): Promise<void> {
    const impuesto = Number((subtotalEsperado * tasa).toFixed(2));
    const total = Number((subtotalEsperado + impuesto).toFixed(2));
    await expect(this.page.locator(CheckoutLocators.subtotalLabel)).toContainText(
      subtotalEsperado.toFixed(2),
    );
    await expect(this.page.locator(CheckoutLocators.totalLabel)).toContainText(total.toFixed(2));
  }

  @Step("Finalizar la compra")
  async finalizar(): Promise<void> {
    await this.presionar(CheckoutLocators.finish);
  }

  @Step('Verificar confirmacion "{0}"')
  async verificarConfirmacion(mensajeEsperado: string): Promise<void> {
    await expect(this.page.locator(CheckoutLocators.completeHeader)).toHaveText(mensajeEsperado);
  }
}
