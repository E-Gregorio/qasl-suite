import { expect } from "@playwright/test";
import { Step } from "@core/allure";
import { LoginLocators } from "@locators/login.locators";
import { BasePage } from "@pages/base.page";
import { Rutas } from "@data/routes.data";

export class LoginPage extends BasePage {
  @Step("Abrir la pantalla de login")
  async abrirLogin(): Promise<void> {
    await this.abrir(Rutas.login);
  }

  @Step('Iniciar sesion como "{0}"', { params: ["usuario", "password"], mask: ["password"] })
  async iniciarSesion(usuario: string, password: string): Promise<void> {
    await this.completar(LoginLocators.username, usuario);
    await this.completar(LoginLocators.password, password);
    await this.presionar(LoginLocators.submit);
  }

  @Step("Verificar acceso al catalogo")
  async verificarAccesoConcedido(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(Rutas.inventario));
  }

  @Step('Verificar mensaje de rechazo "{0}"')
  async verificarRechazo(mensajeEsperado: string): Promise<void> {
    await expect(this.page.locator(LoginLocators.error)).toHaveText(mensajeEsperado);
  }
}
