export const ApiPaths = {
  productos: "/products",
  producto: (id: number): string => `/products/${id}`,
  altaProducto: "/products/add",
  categorias: "/products/categories",
  productosPorCategoria: (categoria: string): string => `/products/category/${categoria}`,
  carritos: "/carts",
  carrito: (id: number): string => `/carts/${id}`,
  altaCarrito: "/carts/add",
} as const;
