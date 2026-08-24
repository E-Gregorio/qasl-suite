import "@core/fixtures/test";
import {
  BeforeEach,
  Cases,
  Description,
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
  Tms,
} from "@core/allure";
import type { Fixtures } from "@core/fixtures/test";
import { loginsRechazados, usuarioValido, type LoginAttempt } from "@data/users.data";
import { InventoryMessages } from "@data/messages.data";

@Epic("Tienda online")
@Feature("Autenticacion")
@Owner("elyer.maldonado")
@Layer(LAYER.E2E)
@Tag("@e2e", "@regression")
@TestSuite("Login de usuarios")
export class LoginSuite {
  @BeforeEach()
  async abrirLogin({ loginPage }: Fixtures): Promise<void> {
    await loginPage.abrirLogin();
  }

  @Story("Acceso concedido")
  @Severity(SEVERITY.BLOCKER)
  @Tms("TC-1001")
  @Tag("@smoke")
  @Description("Un usuario habilitado accede al catalogo de productos.")
  @Test("el usuario estandar accede al catalogo")
  async accesoConcedido({ loginPage, inventoryPage }: Fixtures): Promise<void> {
    await loginPage.iniciarSesion(usuarioValido.usuario, usuarioValido.password);
    await loginPage.verificarAccesoConcedido();
    await inventoryPage.verificarTitulo(InventoryMessages.titulo);
  }

  @Story("Acceso denegado")
  @Severity(SEVERITY.CRITICAL)
  @Tms("TC-1002")
  @Cases(loginsRechazados, (intento) => `rechaza el login: ${intento.caso}`)
  @Test()
  async accesoDenegado(intento: LoginAttempt, { loginPage }: Fixtures): Promise<void> {
    await loginPage.iniciarSesion(intento.usuario, intento.password);
    await loginPage.verificarRechazo(intento.mensajeEsperado);
  }
}
