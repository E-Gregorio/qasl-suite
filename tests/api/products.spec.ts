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
import {
  CategoriasEsperadas,
  IdsApi,
  LimitesApi,
  StatusEsperado,
  productoNuevo,
} from "@data/api.data";
import { Casos, Epica, Escenarios, Historias, Suites } from "@data/trazabilidad.data";

@Epic(Epica)
@Feature(Historias.productos)
@Owner("elyer.maldonado")
@Layer(LAYER.API)
@Tag("@api", "@regression", "@HU-003")
@Parameter("entorno", env.name)
@TestSuite(Suites.productos)
export class ProductsApiSuite {
  @Story(Escenarios.productos.consulta)
  @Severity(SEVERITY.CRITICAL)
  @TestCase("HU-003|TS-01|TC-01")
  @Tag("@smoke", "@E1", "@BR1")
  @DescriptionHtml(Casos.productos["TC-01"].descripcion)
  @Test(Casos.productos["TC-01"].titulo)
  async listado({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.listar(LimitesApi.productosPorPagina);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    await api.verificarTiempoDeRespuesta(respuesta, LimitesApi.tiempoMaximoMs);

    expect(
      respuesta.body.products,
      `el listado debe traer ${LimitesApi.productosPorPagina} productos dentro de products`,
    ).toHaveLength(LimitesApi.productosPorPagina);
    expect(respuesta.body.products[0], "cada producto debe traer id, title, price y category").toMatchObject({
      id: expect.any(Number),
      title: expect.any(String),
      price: expect.any(Number),
      category: expect.any(String),
    });
  }

  @Story(Escenarios.productos.consulta)
  @Severity(SEVERITY.NORMAL)
  @TestCase("HU-003|TS-01|TC-02")
  @Tag("@E2", "@BR2")
  @DescriptionHtml(Casos.productos["TC-02"].descripcion)
  @Test(Casos.productos["TC-02"].titulo)
  async detalle({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.porId(IdsApi.productoExistente);

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(respuesta.body.id, "el servicio debe devolver el producto pedido").toBe(IdsApi.productoExistente);
    expect(respuesta.body, "el producto debe traer rating y stock numericos").toMatchObject({
      rating: expect.any(Number),
      stock: expect.any(Number),
    });
  }

  @Story(Escenarios.productos.consulta)
  @Severity(SEVERITY.MINOR)
  @TestCase("HU-003|TS-01|TC-03")
  @Tag("@E3", "@BR3")
  @DescriptionHtml(Casos.productos["TC-03"].descripcion)
  @Test(Casos.productos["TC-03"].titulo)
  async categorias({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.categorias();

    await api.verificarStatus(respuesta, StatusEsperado.ok);
    expect(
      respuesta.body.map((categoria) => categoria.slug),
      `las categorias deben incluir ${CategoriasEsperadas.join(" y ")}`,
    ).toEqual(expect.arrayContaining([...CategoriasEsperadas]));
  }

  @Story(Escenarios.productos.alta)
  @Severity(SEVERITY.NORMAL)
  @TestCase("HU-003|TS-02|TC-04")
  @Tag("@E4", "@BR4")
  @DescriptionHtml(Casos.productos["TC-04"].descripcion)
  @Test(Casos.productos["TC-04"].titulo)
  async alta({ productsApi, api }: Fixtures): Promise<void> {
    const respuesta = await productsApi.crear(productoNuevo);

    await api.verificarStatus(respuesta, StatusEsperado.creado);
    expect(respuesta.body.id, "la respuesta del alta debe incluir el id del producto").toBeDefined();
  }
}
