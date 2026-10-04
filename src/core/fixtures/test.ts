import type {
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from "@playwright/test";
import { test as base, expect } from "@playwright/test";
import { useTest } from "@core/allure";
import { env } from "@core/config/env";
import { HeadersPorDefecto } from "@data/api.data";
import { ApiClient } from "@core/api/api-client";
import { ProductsApi } from "@api/endpoints/products.api";
import { CartsApi } from "@api/endpoints/carts.api";
import { LoginPage } from "@pages/login.page";
import { InventoryPage } from "@pages/inventory.page";
import { CartPage } from "@pages/cart.page";
import { CheckoutPage } from "@pages/checkout.page";
import { InspectorDeSeguridad } from "@core/seguridad/inspector";
import { ApiPaths } from "@api/endpoints/api.paths";
import { IdsApi } from "@data/api.data";
import { Rutas } from "@data/routes.data";

export interface AppFixtures {
  api: ApiClient;
  productsApi: ProductsApi;
  cartsApi: CartsApi;
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  seguridadWeb: InspectorDeSeguridad;
  seguridadApi: InspectorDeSeguridad;
}

export const test = base.extend<AppFixtures>({
  api: async ({ request }, use) => {
    await use(new ApiClient(request, env.apiBaseUrl, { headersPorDefecto: HeadersPorDefecto }));
  },
  productsApi: async ({ api }, use) => {
    await use(new ProductsApi(api));
  },
  cartsApi: async ({ api }, use) => {
    await use(new CartsApi(api));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  seguridadWeb: async ({ request }, use) => {
    await use(new InspectorDeSeguridad(request, env.baseUrl, Rutas.login));
  },
  seguridadApi: async ({ request }, use) => {
    await use(new InspectorDeSeguridad(request, env.apiBaseUrl, ApiPaths.producto(IdsApi.productoExistente)));
  },
});

useTest(test);

export { expect };

export type Fixtures = AppFixtures &
  PlaywrightTestArgs &
  PlaywrightTestOptions &
  PlaywrightWorkerArgs &
  PlaywrightWorkerOptions;
