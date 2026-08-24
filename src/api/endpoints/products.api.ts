import { Step } from "@core/allure";
import type { ApiClient, ApiResult } from "@core/api/api-client";
import { ApiPaths } from "@api/endpoints/api.paths";
import type { NuevoProducto, Product } from "@api/models/product.model";

export class ProductsApi {
  constructor(private readonly api: ApiClient) {}

  @Step("Listar productos (limite {0})")
  async listar(limite: number): Promise<ApiResult<Product[]>> {
    return this.api.get<Product[]>(ApiPaths.productos, { params: { limit: limite } });
  }

  @Step("Obtener el producto {0}")
  async porId(id: number): Promise<ApiResult<Product>> {
    return this.api.get<Product>(ApiPaths.producto(id));
  }

  @Step("Listar las categorias")
  async categorias(): Promise<ApiResult<string[]>> {
    return this.api.get<string[]>(ApiPaths.categorias);
  }

  @Step('Listar productos de la categoria "{0}"')
  async porCategoria(categoria: string): Promise<ApiResult<Product[]>> {
    return this.api.get<Product[]>(ApiPaths.productosPorCategoria(categoria));
  }

  @Step('Crear el producto "{0.title}"')
  async crear(producto: NuevoProducto): Promise<ApiResult<Product>> {
    return this.api.post<Product>(ApiPaths.productos, { data: producto });
  }
}
