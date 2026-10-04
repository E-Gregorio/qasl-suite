import "@core/fixtures/test";
import { expect } from "@playwright/test";
import {
  DescriptionHtml,
  Epic,
  Feature,
  LAYER,
  Layer,
  Owner,
  Parameter,
  SEVERITY,
  Severity,
  Story,
  Tag,
  Test,
  TestSuite,
  TestCase,
} from "@core/allure";
import type { Fixtures } from "@core/fixtures/test";
import { env } from "@core/config/env";
import { IdsApi, LimitesApi, StatusEsperado, carritoNuevo } from "@data/api.data";
import { Casos, Epica, Escenarios, Historias, Suites } from "@data/trazabilidad.data";

@Epic(Epica)
@Feature(Historias.carritos)
@Owner("elyer.maldonado")
@Layer(LAYER.API)
@Tag("@api", "@regression", "@HU-004")
@Parameter("entorno", env.name)
@TestSuite(Suites.carritos)
export class CartsApiSuite {
  @Story(Escenarios.carritos.consulta)
  @Severity(SEVERITY.CRITICAL)
  @TestCase("HU-004|TS-01|TC-01")
  @Tag("@smoke", "@E1", "@BR1")
  @DescriptionHtml(Casos.carritos["TC-01"].descripcion)
  @Test(Casos.carritos["TC-01"].titulo)
  async listado({ cartsApi, api }: Fixtures): Promise<void> {
    const respuesta = await cartsApi.listar(LimitesApi.carritosPorPagina);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(
      respuesta.body.carts,
      `el listado debe traer ${LimitesApi.carritosPorPagina} carritos dentro de carts`,
    ).toHaveLength(LimitesApi.carritosPorPagina);
    expect(respuesta.body.carts[0].products[0], "cada item debe traer id y quantity numericos").toMatchObject({
      id: expect.any(Number),
      quantity: expect.any(Number),
    });
  }

  @Story(Escenarios.carritos.consulta)
  @Severity(SEVERITY.NORMAL)
  @TestCase("HU-004|TS-01|TC-02")
  @Tag("@E2", "@BR2")
  @DescriptionHtml(Casos.carritos["TC-02"].descripcion)
  @Test(Casos.carritos["TC-02"].titulo)
  async detalle({ cartsApi, api }: Fixtures): Promise<void> {
    const respuesta = await cartsApi.porId(IdsApi.carritoExistente);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(respuesta.body.id, "el servicio debe devolver el carrito pedido").toBe(IdsApi.carritoExistente);
  }

  @Story(Escenarios.carritos.alta)
  @Severity(SEVERITY.NORMAL)
  @TestCase("HU-004|TS-02|TC-03")
  @Tag("@E3", "@BR3")
  @DescriptionHtml(Casos.carritos["TC-03"].descripcion)
  @Test(Casos.carritos["TC-03"].titulo)
  async alta({ cartsApi, api }: Fixtures): Promise<void> {
    const respuesta = await cartsApi.crear(carritoNuevo);

    await api.verificarStatus(respuesta, StatusEsperado.creado);
    expect(respuesta.body.id, "la respuesta del alta debe incluir el id del carrito").toBeDefined();
  }
}
