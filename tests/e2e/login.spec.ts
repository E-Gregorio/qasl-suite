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
import { loginsRechazados, usuarioValido, type LoginAttempt } from "@data/users.data";
import { InventoryMessages } from "@data/messages.data";
import { Casos, Epica, Escenarios, Historias, Suites } from "@data/trazabilidad.data";

@Epic(Epica)
@Feature(Historias.login)
@Owner("elyer.maldonado")
@Layer(LAYER.E2E)
@Tag("@e2e", "@regression", "@HU-001")
@TestSuite(Suites.login)
export class LoginSuite {
  @BeforeEach()
  async abrirLogin({ loginPage }: Fixtures): Promise<void> {
    await loginPage.abrirLogin();
  }

  @Story(Escenarios.login.concedido)
  @Severity(SEVERITY.BLOCKER)
  @TestCase("HU-001|TS-01|TC-01")
  @Tag("@smoke", "@E1", "@BR1")
  @DescriptionHtml(Casos.login["TC-01"].descripcion)
  @Test(Casos.login["TC-01"].titulo)
  async accesoConcedido({ loginPage, inventoryPage }: Fixtures): Promise<void> {
    await loginPage.iniciarSesion(usuarioValido.usuario, usuarioValido.password);
    await loginPage.verificarAccesoConcedido();
    await inventoryPage.verificarTitulo(InventoryMessages.titulo);
  }

  @Story(Escenarios.login.denegado)
  @Severity(SEVERITY.CRITICAL)
  @TestCase(
    "HU-001|TS-02|TC-02",
    "HU-001|TS-02|TC-03",
    "HU-001|TS-02|TC-04",
    "HU-001|TS-02|TC-05",
    "HU-001|TS-02|TC-06",
  )
  @Tag("@BR2", "@BR3", "@BR4")
  @Cases(loginsRechazados, (intento) => Casos.login[intento.tc].titulo)
  @Test()
  async accesoDenegado(intento: LoginAttempt, { loginPage }: Fixtures): Promise<void> {
    await allureDescriptionHtml(Casos.login[intento.tc].descripcion);
    await loginPage.iniciarSesion(intento.usuario, intento.password);
    await loginPage.verificarRechazo(intento.mensajeEsperado);
  }
}
