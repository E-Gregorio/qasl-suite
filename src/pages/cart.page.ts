import { expect } from "@playwright/test";
import { Step } from "@core/allure";
import { CartLocators } from "@locators/cart.locators";
import { BasePage } from "@pages/base.page";
import type { Producto } from "@data/products.data";

export class CartPage extends BasePage {
  @Step('Verificar que el carrito muestra "{0}"')
  async verificarTitulo(titulo: string): Promise<void> {
    await expect(this.page.locator(CartLocators.title)).toHaveText(titulo);
  }

  @Step("Verificar los productos del carrito")
  async verificarProductos(productos: Producto[]): Promise<void> {
    const nombres = this.page.locator(CartLocators.itemName);
    await expect(nombres).toHaveText(productos.map((producto) => producto.nombre));
  }

  @Step("Continuar al checkout")
  async continuarAlCheckout(): Promise<void> {
    await this.presionar(CartLocators.checkout);
  }
}
