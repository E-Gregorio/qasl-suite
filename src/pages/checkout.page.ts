import { expect } from "@playwright/test";
import { Step } from "@core/allure";
import { CheckoutLocators } from "@locators/checkout.locators";
import { BasePage } from "@pages/base.page";
import type { DatosComprador } from "@data/checkout.data";
import { adjuntarEsperadoObtenido } from "@core/evidencia/esperado-obtenido";

export class CheckoutPage extends BasePage {
  @Step('Completar los datos del comprador "{0.nombre} {0.apellido}"')
  async completarDatos(datos: DatosComprador): Promise<void> {
    await this.completar(CheckoutLocators.firstName, datos.nombre);
    await this.completar(CheckoutLocators.lastName, datos.apellido);
    await this.completar(CheckoutLocators.postalCode, datos.codigoPostal);
    await this.evidencia("Datos del comprador cargados");
    await this.presionar(CheckoutLocators.continue);
  }

  @Step('Verificar mensaje de validacion "{0}"')
  async verificarValidacion(mensajeEsperado: string): Promise<void> {
    await expect(
      this.page.locator(CheckoutLocators.error),
      "el checkout debe indicar el campo obligatorio que falta",
    ).toHaveText(mensajeEsperado);
    await this.evidencia("Mensaje de validacion del checkout");
  }

  @Step("Verificar el total del pedido: subtotal {0} mas impuesto")
  async verificarTotal(subtotalEsperado: number, tasa: number): Promise<void> {
    const impuesto = Number((subtotalEsperado * tasa).toFixed(2));
    const total = Number((subtotalEsperado + impuesto).toFixed(2));
    await this.page.locator(CheckoutLocators.totalLabel).waitFor();
    await adjuntarEsperadoObtenido("Resumen del pedido: esperado contra obtenido", [
      {
        concepto: "Subtotal",
        esperado: subtotalEsperado.toFixed(2),
        obtenido: await this.texto(CheckoutLocators.subtotalLabel),
      },
      {
        concepto: `Impuesto (${(tasa * 100).toFixed(0)} %)`,
        esperado: impuesto.toFixed(2),
        obtenido: await this.texto(CheckoutLocators.taxLabel),
      },
      { concepto: "Total", esperado: total.toFixed(2), obtenido: await this.texto(CheckoutLocators.totalLabel) },
    ], "Obtenido en pantalla");
    await this.evidencia("Resumen del pedido con subtotal, impuesto y total");
    await expect(
      this.page.locator(CheckoutLocators.subtotalLabel),
      "el subtotal debe ser la suma de los precios de los productos",
    ).toContainText(subtotalEsperado.toFixed(2));
    await expect(
      this.page.locator(CheckoutLocators.taxLabel),
      "el impuesto debe ser el porcentaje de la regla sobre el subtotal",
    ).toContainText(impuesto.toFixed(2));
    await expect(
      this.page.locator(CheckoutLocators.totalLabel),
      "el total debe ser el subtotal mas el impuesto",
    ).toContainText(total.toFixed(2));
  }

  @Step("Finalizar la compra")
  async finalizar(): Promise<void> {
    await this.presionar(CheckoutLocators.finish);
  }

  @Step('Verificar confirmacion "{0}"')
  async verificarConfirmacion(mensajeEsperado: string): Promise<void> {
    await expect(
      this.page.locator(CheckoutLocators.completeHeader),
      "la compra debe confirmarse con el mensaje de la regla",
    ).toHaveText(mensajeEsperado);
    await this.evidencia("Confirmacion de la compra");
  }
}
