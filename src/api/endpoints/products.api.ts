import { Step } from "@core/allure";
import type { ApiClient, ApiResult } from "@core/api/api-client";
import { ApiPaths } from "@api/endpoints/api.paths";
import type { Category, NuevoProducto, Product, ProductList } from "@api/models/product.model";

export class ProductsApi {
  constructor(private readonly api: ApiClient) {}

  @Step("Listar productos (limite {0})")
  async listar(limite: number): Promise<ApiResult<ProductList>> {
    return this.api.get<ProductList>(ApiPaths.productos, { params: { limit: limite } });
  }

  @Step("Obtener el producto {0}")
  async porId(id: number): Promise<ApiResult<Product>> {
    return this.api.get<Product>(ApiPaths.producto(id));
  }

  @Step("Listar las categorias")
  async categorias(): Promise<ApiResult<Category[]>> {
    return this.api.get<Category[]>(ApiPaths.categorias);
  }

  @Step('Listar productos de la categoria "{0}"')
  async porCategoria(categoria: string): Promise<ApiResult<ProductList>> {
    return this.api.get<ProductList>(ApiPaths.productosPorCategoria(categoria));
  }

  @Step('Crear el producto "{0.title}"')
  async crear(producto: NuevoProducto): Promise<ApiResult<Product>> {
    return this.api.post<Product>(ApiPaths.altaProducto, { data: producto });
  }
}
