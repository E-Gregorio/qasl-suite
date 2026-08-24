import "@core/fixtures/test";
import { expect } from "@playwright/test";
import {
  Description,
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
  Tms,
} from "@core/allure";
import type { Fixtures } from "@core/fixtures/test";
import { env } from "@core/config/env";
import { IdsApi, LimitesApi, StatusEsperado, carritoNuevo } from "@data/api.data";

@Epic("Tienda online")
@Feature("API de carritos")
@Owner("elyer.maldonado")
@Layer(LAYER.API)
@Tag("@api", "@regression")
@Parameter("entorno", env.name)
@TestSuite("API - Carritos")
export class CartsApiSuite {
  @Story("Consulta de carritos")
  @Severity(SEVERITY.CRITICAL)
  @Tms("TC-4001")
  @Tag("@smoke")
  @Description("Verifica el contrato del listado de carritos y de sus items.")
  @Test("GET /carts devuelve carritos con sus items")
  async listado({ cartsApi, api }: Fixtures): Promise<void> {
    const respuesta = await cartsApi.listar(LimitesApi.carritosPorPagina);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(respuesta.body).toHaveLength(LimitesApi.carritosPorPagina);
    expect(respuesta.body[0].products[0]).toMatchObject({
      productId: expect.any(Number),
      quantity: expect.any(Number),
    });
  }

  @Story("Consulta de carritos")
  @Severity(SEVERITY.NORMAL)
  @Tms("TC-4002")
  @Test("GET /carts/:id devuelve el carrito solicitado")
  async detalle({ cartsApi, api }: Fixtures): Promise<void> {
    const respuesta = await cartsApi.porId(IdsApi.carritoExistente);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(respuesta.body.id).toBe(IdsApi.carritoExistente);
  }

  @Story("Alta de carritos")
  @Severity(SEVERITY.NORMAL)
  @Tms("TC-4003")
  @Test("POST /carts crea un carrito con dos productos")
  async alta({ cartsApi, api }: Fixtures): Promise<void> {
    const respuesta = await cartsApi.crear(carritoNuevo);

    await api.verificarStatus(respuesta, StatusEsperado.creado);
    expect(respuesta.body.id).toBeDefined();
  }
}
