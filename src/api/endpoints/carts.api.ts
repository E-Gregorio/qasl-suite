import { Step } from "@core/allure";
import type { ApiClient, ApiResult } from "@core/api/api-client";
import { ApiPaths } from "@api/endpoints/api.paths";
import type { Cart, CartList, NuevoCarrito } from "@api/models/product.model";

export class CartsApi {
  constructor(private readonly api: ApiClient) {}

  @Step("Listar carritos (limite {0})")
  async listar(limite: number): Promise<ApiResult<CartList>> {
    return this.api.get<CartList>(ApiPaths.carritos, { params: { limit: limite } });
  }

  @Step("Obtener el carrito {0}")
  async porId(id: number): Promise<ApiResult<Cart>> {
    return this.api.get<Cart>(ApiPaths.carrito(id));
  }

  @Step("Crear un carrito para el usuario {0.userId}")
  async crear(carrito: NuevoCarrito): Promise<ApiResult<Cart>> {
    return this.api.post<Cart>(ApiPaths.altaCarrito, { data: carrito });
  }
}
