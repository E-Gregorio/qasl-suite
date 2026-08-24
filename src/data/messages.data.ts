export const LoginMessages = {
  usuarioBloqueado: "Epic sadface: Sorry, this user has been locked out.",
  credencialesInvalidas:
    "Epic sadface: Username and password do not match any user in this service",
  usuarioRequerido: "Epic sadface: Username is required",
  passwordRequerida: "Epic sadface: Password is required",
} as const;

export const CheckoutMessages = {
  nombreRequerido: "Error: First Name is required",
  apellidoRequerido: "Error: Last Name is required",
  codigoPostalRequerido: "Error: Postal Code is required",
  compraFinalizada: "Thank you for your order!",
} as const;

export const InventoryMessages = {
  titulo: "Products",
} as const;

export const CartMessages = {
  titulo: "Your Cart",
} as const;
