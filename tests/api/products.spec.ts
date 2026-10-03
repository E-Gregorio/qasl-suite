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
  TestCase,
} from "@core/allure";
import type { Fixtures } from "@core/fixtures/test";
import { env } from "@core/config/env";
import {
  CategoriasEsperadas,
  IdsApi,
  LimitesApi,
  StatusEsperado,
  productoNuevo,
} from "@data/api.data";

@Epic("Tienda online")
@Feature("API de productos")
@Owner("elyer.maldonado")
@Layer(LAYER.API)
@Tag("@api", "@regression")
@Parameter("entorno", env.name)
@TestSuite("API - Productos")
export class ProductsApiSuite {
  @Story("Consulta de catalogo")
  @Severity(SEVERITY.CRITICAL)
  @TestCase("HU-003|TS-01|TC-01")
  @Tag("@smoke")
  @Description("Verifica el contrato del listado paginado y su tiempo de respuesta.")
  @Test("GET /products devuelve el listado paginado")
  async listado({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.listar(LimitesApi.productosPorPagina);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    await api.verificarTiempoDeRespuesta(respuesta, LimitesApi.tiempoMaximoMs);

    expect(respuesta.body).toHaveLength(LimitesApi.productosPorPagina);
    expect(respuesta.body[0]).toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      price: expect.any(Number),
      category: expect.any(String),
    });
  }

  @Story("Consulta de catalogo")
  @Severity(SEVERITY.NORMAL)
  @TestCase("HU-003|TS-01|TC-02")
  @Test("GET /products/:id devuelve el detalle del producto")
  async detalle({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.porId(IdsApi.productoExistente);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(respuesta.body.id).toBe(IdsApi.productoExistente);
    expect(respuesta.body.rating).toMatchObject({
      rate: expect.any(Number),
      count: expect.any(Number),
    });
  }

  @Story("Consulta de catalogo")
  @Severity(SEVERITY.MINOR)
  @TestCase("HU-003|TS-01|TC-03")
  @Test("GET /products/categories devuelve las categorias conocidas")
  async categorias({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.categorias();

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(respuesta.body).toEqual(expect.arrayContaining([...CategoriasEsperadas]));
  }

  @Story("Alta de productos")
  @Severity(SEVERITY.NORMAL)
  @TestCase("HU-003|TS-02|TC-04")
  @Test("POST /products crea un producto")
  async alta({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.crear(productoNuevo);

    await api.verificarStatus(respuesta, StatusEsperado.creado);
    expect(respuesta.body.id).toBeDefined();
  }
}
