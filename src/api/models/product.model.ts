export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  stock: number;
}

export interface ProductList {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface Category {
  slug: string;
  name: string;
  url: string;
}

export interface NuevoProducto {
  title: string;
  price: number;
  description: string;
  category: string;
}

export interface CartLine {
  id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Cart {
  id: number;
  userId: number;
  products: CartLine[];
  total: number;
  totalProducts: number;
  totalQuantity: number;
}

export interface CartList {
  carts: Cart[];
  total: number;
  skip: number;
  limit: number;
}

export interface CartItem {
  id: number;
  quantity: number;
}

export interface NuevoCarrito {
  userId: number;
  products: CartItem[];
}
