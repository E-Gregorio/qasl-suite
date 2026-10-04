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
  ClickjackingPermitido,
  ControlesDeSeguridad,
  FeaturesDeSeguridad,
  Owasp,
  PrefijoDeHallazgo,
  RedireccionesValidas,
  SuitesDeSeguridad,
} from "@data/seguridad.data";
import { Epica } from "@data/trazabilidad.data";

const control = ControlesDeSeguridad.web;

@Epic(Epica)
@Feature(FeaturesDeSeguridad.web)
@Owner("elyer.maldonado")
@Layer(LAYER.SECURITY)
@Tag("@seguridad", "@regression")
@TestSuite(SuitesDeSeguridad.web)
export class SeguridadWebSuite {
  @Story(Owasp.criptografia)
  @Severity(SEVERITY.CRITICAL)
  @Tag("@OWASP-A02")
  @DescriptionHtml(control.https.descripcion)
  @Test(control.https.titulo)
  async redirigeAHttps({ seguridadWeb }: Fixtures): Promise<void> {
    const respuesta = await seguridadWeb.consultarSinCifrar();
    const destino = cabecera(respuesta, "location") ?? ausente;
    await seguridadWeb.contrastar("Redireccion de HTTP a HTTPS", [
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

  @Story(Owasp.criptografia)
  @Severity(SEVERITY.NORMAL)
  @Tag("@OWASP-A02")
  @DescriptionHtml(control.hsts.descripcion)
  @Test(control.hsts.titulo)
  async declaraHsts({ seguridadWeb }: Fixtures): Promise<void> {
    const respuesta = await seguridadWeb.consultar();
    const hsts = cabecera(respuesta, "strict-transport-security") ?? ausente;
    await seguridadWeb.contrastar("Strict-Transport-Security", [
      {
        concepto: "Strict-Transport-Security",
        esperado: "max-age=...",
        obtenido: hsts,
        cumple: /max-age=\d+/.test(hsts),
      },
    ]);
    expect(hsts, `${PrefijoDeHallazgo} la tienda no declara Strict-Transport-Security`).toMatch(
      /max-age=\d+/,
    );
  }

  @Story(Owasp.configuracion)
  @Severity(SEVERITY.NORMAL)
  @Tag("@OWASP-A05")
  @DescriptionHtml(control.nosniff.descripcion)
  @Test(control.nosniff.titulo)
  async declaraNosniff({ seguridadWeb }: Fixtures): Promise<void> {
    const respuesta = await seguridadWeb.consultar();
    const valor = cabecera(respuesta, "x-content-type-options") ?? ausente;
    await seguridadWeb.contrastar("X-Content-Type-Options", [
      {
        concepto: "X-Content-Type-Options",
        esperado: "nosniff",
        obtenido: valor,
        cumple: valor.toLowerCase() === "nosniff",
      },
    ]);
    expect(
      valor.toLowerCase(),
      `${PrefijoDeHallazgo} la tienda no declara X-Content-Type-Options: nosniff`,
    ).toBe("nosniff");
  }

  @Story(Owasp.configuracion)
  @Severity(SEVERITY.NORMAL)
  @Tag("@OWASP-A05")
  @DescriptionHtml(control.clickjacking.descripcion)
  @Test(control.clickjacking.titulo)
  async impideClickjacking({ seguridadWeb }: Fixtures): Promise<void> {
    const respuesta = await seguridadWeb.consultar();
    const marco = (cabecera(respuesta, "x-frame-options") ?? ausente).toUpperCase();
    const csp = cabecera(respuesta, "content-security-policy") ?? ausente;
    const protegida = ClickjackingPermitido.some((v) => v === marco) || csp.includes("frame-ancestors");
    await seguridadWeb.contrastar("Proteccion contra clickjacking", [
      {
        concepto: "X-Frame-Options",
        esperado: ClickjackingPermitido.join(" o "),
        obtenido: marco,
        cumple: protegida,
      },
      { concepto: "CSP frame-ancestors", esperado: "frame-ancestors ...", obtenido: csp, cumple: protegida },
    ]);
    expect(protegida, `${PrefijoDeHallazgo} la tienda puede ser embebida en un marco ajeno`).toBe(true);
  }

  @Story(Owasp.configuracion)
  @Severity(SEVERITY.NORMAL)
  @Tag("@OWASP-A05")
  @DescriptionHtml(control.csp.descripcion)
  @Test(control.csp.titulo)
  async declaraCsp({ seguridadWeb }: Fixtures): Promise<void> {
    const respuesta = await seguridadWeb.consultar();
    const csp = cabecera(respuesta, "content-security-policy") ?? ausente;
    await seguridadWeb.contrastar("Content-Security-Policy", [
      {
        concepto: "Content-Security-Policy",
        esperado: "una politica declarada",
        obtenido: csp,
        cumple: csp !== ausente,
      },
    ]);
    expect(csp, `${PrefijoDeHallazgo} la tienda no declara Content-Security-Policy`).not.toBe(ausente);
  }

  @Story(Owasp.configuracion)
  @Severity(SEVERITY.MINOR)
  @Tag("@OWASP-A05")
  @DescriptionHtml(control.tecnologia.descripcion)
  @Test(control.tecnologia.titulo)
  async ocultaTecnologia({ seguridadWeb }: Fixtures): Promise<void> {
    const respuesta = await seguridadWeb.consultar();
    const motor = cabecera(respuesta, "x-powered-by") ?? ausente;
    const servidor = cabecera(respuesta, "server") ?? ausente;
    await seguridadWeb.contrastar("Exposicion de la tecnologia", [
      { concepto: "X-Powered-By", esperado: ausente, obtenido: motor, cumple: motor === ausente },
      { concepto: "Server", esperado: "sin version", obtenido: servidor, cumple: !/\d/.test(servidor) },
    ]);
    expect(motor, `${PrefijoDeHallazgo} la tienda expone X-Powered-By: ${motor}`).toBe(ausente);
    expect(
      servidor,
      `${PrefijoDeHallazgo} la tienda expone la version del servidor: ${servidor}`,
    ).not.toMatch(/\d/);
  }
}
