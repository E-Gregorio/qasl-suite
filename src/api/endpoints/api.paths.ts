export const ApiPaths = {
  productos: "/products",
  producto: (id: number): string => `/products/${id}`,
  categorias: "/products/categories",
  productosPorCategoria: (categoria: string): string => `/products/category/${categoria}`,
  carritos: "/carts",
  carrito: (id: number): string => `/carts/${id}`,
} as const;
