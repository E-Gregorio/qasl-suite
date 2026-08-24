import "@core/fixtures/test";
import {
  BeforeEach,
  Cases,
  Description,
  Epic,
  Feature,
  Issue,
  LAYER,
  Layer,
  Owner,
  SEVERITY,
  Severity,
  Story,
  Tag,
  Test,
  TestSuite,
  Tms,
} from "@core/allure";
import type { Fixtures } from "@core/fixtures/test";
import { usuarioValido } from "@data/users.data";
import { productosDelPedido, tasaImpositiva } from "@data/products.data";
import {
  compradorValido,
  formulariosIncompletos,
  type FormularioIncompleto,
} from "@data/checkout.data";
import { CartMessages, CheckoutMessages, InventoryMessages } from "@data/messages.data";

@Epic("Tienda online")
@Feature("Compra")
@Owner("elyer.maldonado")
@Layer(LAYER.E2E)
@Tag("@e2e", "@regression")
@TestSuite("Flujo de compra")
export class CheckoutSuite {
  @BeforeEach()
  async iniciarSesion({ loginPage, inventoryPage }: Fixtures): Promise<void> {
    await loginPage.abrirLogin();
    await loginPage.iniciarSesion(usuarioValido.usuario, usuarioValido.password);
    await inventoryPage.verificarTitulo(InventoryMessages.titulo);
  }

  @Story("Compra completa")
  @Severity(SEVERITY.BLOCKER)
  @Tms("TC-2001")
  @Tag("@smoke")
  @Description("Recorrido completo: catalogo, carrito, datos del comprador, resumen y confirmacion.")
  @Test("el usuario completa una compra de dos productos")
  async compraCompleta({
    inventoryPage,
    cartPage,
    checkoutPage,
  }: Fixtures): Promise<void> {
    for (const producto of productosDelPedido) {
      await inventoryPage.agregarAlCarrito(producto);
    }
    await inventoryPage.verificarCantidadEnCarrito(productosDelPedido.length);
    await inventoryPage.abrirCarrito();

    await cartPage.verificarTitulo(CartMessages.titulo);
    await cartPage.verificarProductos(productosDelPedido);
    await cartPage.continuarAlCheckout();

    await checkoutPage.completarDatos(compradorValido);
    const subtotal = productosDelPedido.reduce((total, producto) => total + producto.precio, 0);
    await checkoutPage.verificarTotal(Number(subtotal.toFixed(2)), tasaImpositiva);
    await checkoutPage.finalizar();
    await checkoutPage.verificarConfirmacion(CheckoutMessages.compraFinalizada);
  }

  @Story("Validacion del formulario")
  @Severity(SEVERITY.NORMAL)
  @Tms("TC-2002")
  @Issue("BUG-4471")
  @Cases(formulariosIncompletos, (formulario) => `rechaza el checkout ${formulario.caso}`)
  @Test()
  async formularioIncompleto(
    formulario: FormularioIncompleto,
    { inventoryPage, cartPage, checkoutPage }: Fixtures,
  ): Promise<void> {
    await inventoryPage.agregarAlCarrito(productosDelPedido[0]);
    await inventoryPage.abrirCarrito();
    await cartPage.continuarAlCheckout();
    await checkoutPage.completarDatos(formulario.datos);
    await checkoutPage.verificarValidacion(formulario.mensajeEsperado);
  }
}
