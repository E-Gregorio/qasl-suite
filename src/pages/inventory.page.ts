import { expect } from "@playwright/test";
import { Step } from "@core/allure";
import { InventoryLocators } from "@locators/inventory.locators";
import { BasePage } from "@pages/base.page";
import type { Producto } from "@data/products.data";

export class InventoryPage extends BasePage {
  @Step('Verificar que el catalogo muestra "{0}"')
  async verificarTitulo(titulo: string): Promise<void> {
    await expect(
      this.page.locator(InventoryLocators.title),
      "el catalogo debe mostrar su titulo",
    ).toHaveText(titulo);
  }

  @Step('Agregar "{0.nombre}" al carrito')
  async agregarAlCarrito(producto: Producto): Promise<void> {
    await this.presionar(InventoryLocators.addToCart(producto.slug));
  }

  @Step("Verificar que el carrito tiene {0} producto(s)")
  async verificarCantidadEnCarrito(cantidad: number): Promise<void> {
    await expect(
      this.page.locator(InventoryLocators.cartBadge),
      "el contador del carrito debe mostrar la cantidad agregada",
    ).toHaveText(String(cantidad));
    await this.evidencia("Contador del carrito con los productos agregados");
  }

  @Step("Abrir el carrito")
  async abrirCarrito(): Promise<void> {
    await this.presionar(InventoryLocators.cartLink);
  }
}
