import "@core/fixtures/test";
import {
  BeforeEach,
  Cases,
  DescriptionHtml,
  Epic,
  Feature,
  LAYER,
  Layer,
  Owner,
  SEVERITY,
  Severity,
  Story,
  Tag,
  Test,
  TestSuite,
  TestCase,
  allureDescriptionHtml,
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
import { Casos, Epica, Escenarios, Historias, Suites } from "@data/trazabilidad.data";

@Epic(Epica)
@Feature(Historias.compra)
@Owner("elyer.maldonado")
@Layer(LAYER.E2E)
@Tag("@e2e", "@regression", "@HU-002")
@TestSuite(Suites.compra)
export class CheckoutSuite {
  @BeforeEach()
  async iniciarSesion({ loginPage, inventoryPage }: Fixtures): Promise<void> {
    await loginPage.abrirLogin();
    await loginPage.iniciarSesion(usuarioValido.usuario, usuarioValido.password);
    await inventoryPage.verificarTitulo(InventoryMessages.titulo);
  }

  @Story(Escenarios.compra.completa)
  @Severity(SEVERITY.BLOCKER)
  @TestCase("HU-002|TS-01|TC-01")
  @Tag("@smoke", "@E1", "@BR1", "@BR2", "@BR4")
  @DescriptionHtml(Casos.compra["TC-01"].descripcion)
  @Test(Casos.compra["TC-01"].titulo)
  async compraCompleta({ inventoryPage, cartPage, checkoutPage }: Fixtures): Promise<void> {
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

  @Story(Escenarios.compra.formulario)
  @Severity(SEVERITY.NORMAL)
  @TestCase("HU-002|TS-02|TC-02", "HU-002|TS-02|TC-03", "HU-002|TS-02|TC-04")
  @Tag("@BR3")
  @Cases(formulariosIncompletos, (formulario) => Casos.compra[formulario.tc].titulo)
  @Test()
  async formularioIncompleto(
    formulario: FormularioIncompleto,
    { inventoryPage, cartPage, checkoutPage }: Fixtures,
  ): Promise<void> {
    await allureDescriptionHtml(Casos.compra[formulario.tc].descripcion);
    await inventoryPage.agregarAlCarrito(productosDelPedido[0]);
    await inventoryPage.abrirCarrito();
    await cartPage.continuarAlCheckout();
    await checkoutPage.completarDatos(formulario.datos);
    await checkoutPage.verificarValidacion(formulario.mensajeEsperado);
  }
}
