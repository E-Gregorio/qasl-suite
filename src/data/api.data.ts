import type { NuevoCarrito, NuevoProducto } from "@api/models/product.model";

export const HeadersPorDefecto: Record<string, string> = {
  accept: "application/json",
};

export const StatusEsperado = {
  ok: 200,
  creado: 201,
  noEncontrado: 404,
} as const;

export const LimitesApi = {
  productosPorPagina: 5,
  carritosPorPagina: 3,
  tiempoMaximoMs: 3000,
} as const;

export const IdsApi = {
  productoExistente: 1,
  productoInexistente: 999999,
  carritoExistente: 1,
} as const;

export const CategoriasEsperadas = ["beauty", "laptops"] as const;

export const productoNuevo: NuevoProducto = {
  title: "Notebook QASL Edition",
  price: 1299.9,
  description: "Equipo de prueba creado por la suite automatizada",
  category: "laptops",
};

export const carritoNuevo: NuevoCarrito = {
  userId: 7,
  products: [
    { id: 1, quantity: 2 },
    { id: 5, quantity: 1 },
  ],
};
