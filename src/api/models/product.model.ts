export interface Rating {
  rate: number;
  count: number;
}

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: Rating;
}

export interface NuevoProducto {
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
}

export interface Cart {
  id: number;
  userId: number;
  date: string;
  products: CartItem[];
}

export interface NuevoCarrito {
  userId: number;
  date: string;
  products: CartItem[];
}
