import "@core/fixtures/test";
import { expect } from "@playwright/test";
import {
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
} from "@core/allure";
import type { Fixtures } from "@core/fixtures/test";
import { ausente, cabecera } from "@core/seguridad/inspector";
import {
  ControlesDeSeguridad,
  FeaturesDeSeguridad,
  Owasp,
  PrefijoDeHallazgo,
  RedireccionesValidas,
  SuitesDeSeguridad,
} from "@data/seguridad.data";
import { Epica } from "@data/trazabilidad.data";

const control = ControlesDeSeguridad.api;

@Epic(Epica)
@Feature(FeaturesDeSeguridad.api)
@Owner("elyer.maldonado")
@Layer(LAYER.SECURITY)
@Tag("@seguridad", "@regression")
@TestSuite(SuitesDeSeguridad.api)
export class SeguridadApiSuite {
  @Story(Owasp.criptografia)
  @Severity(SEVERITY.CRITICAL)
  @Tag("@OWASP-A02")
  @DescriptionHtml(control.https.descripcion)
  @Test(control.https.titulo)
  async redirigeAHttps({ seguridadApi }: Fixtures): Promise<void> {
    const respuesta = await seguridadApi.consultarSinCifrar();
    const destino = cabecera(respuesta, "location") ?? ausente;
    await seguridadApi.contrastar("Redireccion de HTTP a HTTPS", [
      {
        concepto: "Status",
        esperado: RedireccionesValidas.join(" / "),
        obtenido: String(respuesta.status),
        cumple: RedireccionesValidas.some((s) => s === respuesta.status),
      },
      {
        concepto: "Location",
        esperado: "https://...",
        obtenido: destino,
        cumple: destino.startsWith("https://"),
      },
    ]);
    expect(
      RedireccionesValidas,
      `${PrefijoDeHallazgo} HTTP respondio ${respuesta.status} en lugar de redirigir`,
    ).toContain(respuesta.status);
    expect(destino, `${PrefijoDeHallazgo} la redireccion no lleva a HTTPS`).toMatch(/^https:\/\//);
  }

  @Story(Owasp.configuracion)
  @Severity(SEVERITY.NORMAL)
  @Tag("@OWASP-A05")
  @DescriptionHtml(control.nosniff.descripcion)
  @Test(control.nosniff.titulo)
  async declaraNosniff({ seguridadApi }: Fixtures): Promise<void> {
    const respuesta = await seguridadApi.consultar();
    const valor = cabecera(respuesta, "x-content-type-options") ?? ausente;
    await seguridadApi.contrastar("X-Content-Type-Options", [
      {
        concepto: "X-Content-Type-Options",
        esperado: "nosniff",
        obtenido: valor,
        cumple: valor.toLowerCase() === "nosniff",
      },
    ]);
    expect(
      valor.toLowerCase(),
      `${PrefijoDeHallazgo} la API no declara X-Content-Type-Options: nosniff`,
    ).toBe("nosniff");
  }

  @Story(Owasp.configuracion)
  @Severity(SEVERITY.CRITICAL)
  @Tag("@OWASP-A05")
  @DescriptionHtml(control.cors.descripcion)
  @Test(control.cors.titulo)
  async corsRestringido({ seguridadApi }: Fixtures): Promise<void> {
    const respuesta = await seguridadApi.consultar();
    const origen = cabecera(respuesta, "access-control-allow-origin") ?? ausente;
    const credenciales = cabecera(respuesta, "access-control-allow-credentials") ?? ausente;
    const abierto = origen === "*" && credenciales.toLowerCase() === "true";
    await seguridadApi.contrastar("CORS", [
      {
        concepto: "Access-Control-Allow-Origin",
        esperado: "no * cuando hay credenciales",
        obtenido: origen,
        cumple: !abierto,
      },
      {
        concepto: "Access-Control-Allow-Credentials",
        esperado: "no true cuando el origen es *",
        obtenido: credenciales,
        cumple: !abierto,
      },
    ]);
    expect(
      abierto,
      `${PrefijoDeHallazgo} la API permite a cualquier origen leer respuestas con credenciales`,
    ).toBe(false);
  }

  @Story(Owasp.configuracion)
  @Severity(SEVERITY.MINOR)
  @Tag("@OWASP-A05")
  @DescriptionHtml(control.tecnologia.descripcion)
  @Test(control.tecnologia.titulo)
  async ocultaTecnologia({ seguridadApi }: Fixtures): Promise<void> {
    const respuesta = await seguridadApi.consultar();
    const motor = cabecera(respuesta, "x-powered-by") ?? ausente;
    const servidor = cabecera(respuesta, "server") ?? ausente;
    await seguridadApi.contrastar("Exposicion de la tecnologia", [
      { concepto: "X-Powered-By", esperado: ausente, obtenido: motor, cumple: motor === ausente },
      { concepto: "Server", esperado: "sin version", obtenido: servidor, cumple: !/\d/.test(servidor) },
    ]);
    expect(motor, `${PrefijoDeHallazgo} la API expone X-Powered-By: ${motor}`).toBe(ausente);
    expect(servidor, `${PrefijoDeHallazgo} la API expone la version del servidor: ${servidor}`).not.toMatch(
      /\d/,
    );
  }
}
