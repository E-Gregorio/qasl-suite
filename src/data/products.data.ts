export interface Producto {
  slug: string;
  nombre: string;
  precio: number;
}

export const catalogo = {
  mochila: {
    slug: "sauce-labs-backpack",
    nombre: "Sauce Labs Backpack",
    precio: 29.99,
  },
  linterna: {
    slug: "sauce-labs-bike-light",
    nombre: "Sauce Labs Bike Light",
    precio: 9.99,
  },
  remera: {
    slug: "sauce-labs-bolt-t-shirt",
    nombre: "Sauce Labs Bolt T-Shirt",
    precio: 15.99,
  },
} as const satisfies Record<string, Producto>;

export const productosDelPedido: Producto[] = [catalogo.mochila, catalogo.linterna];

export const tasaImpositiva = 0.08;
