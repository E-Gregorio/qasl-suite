import { expect } from "@playwright/test";
import { Step } from "@core/allure";
import { CartLocators } from "@locators/cart.locators";
import { BasePage } from "@pages/base.page";
import type { Producto } from "@data/products.data";

export class CartPage extends BasePage {
  @Step('Verificar que el carrito muestra "{0}"')
  async verificarTitulo(titulo: string): Promise<void> {
    await expect(this.page.locator(CartLocators.title), "el carrito debe mostrar su titulo").toHaveText(
      titulo,
    );
  }

  @Step("Verificar los productos del carrito")
  async verificarProductos(productos: Producto[]): Promise<void> {
    const nombres = this.page.locator(CartLocators.itemName);
    await expect(nombres, "el carrito debe listar exactamente los productos agregados").toHaveText(
      productos.map((producto) => producto.nombre),
    );
    await this.evidencia("Productos en el carrito");
  }

  @Step("Continuar al checkout")
  async continuarAlCheckout(): Promise<void> {
    await this.presionar(CartLocators.checkout);
  }
}
