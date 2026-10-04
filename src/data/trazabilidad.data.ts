import { descripcionHtml } from "@core/evidencia/descripcion";

export const Epica = "EP-001 · Tienda online";

export const Historias = {
  login: "HU-001 · Inicio de sesión en la tienda online",
  compra: "HU-002 · Compra de productos en la tienda online",
  productos: "HU-003 · API de productos de la tienda",
  carritos: "HU-004 · API de carritos de la tienda",
} as const;

export const Escenarios = {
  login: {
    concedido: "TS-01 · Acceso concedido",
    denegado: "TS-02 · Acceso denegado",
  },
  compra: {
    completa: "TS-01 · Compra completa",
    formulario: "TS-02 · Validación del formulario del comprador",
  },
  productos: {
    consulta: "TS-01 · Consulta del catálogo",
    alta: "TS-02 · Alta de productos",
  },
  carritos: {
    consulta: "TS-01 · Consulta de carritos",
    alta: "TS-02 · Alta de carritos",
  },
} as const;

export const Suites = {
  login: "E2E · HU-001 Inicio de sesión",
  compra: "E2E · HU-002 Compra de productos",
  productos: "API · HU-003 Productos",
  carritos: "API · HU-004 Carritos",
} as const;

export interface CasoTrazado {
  titulo: string;
  descripcion: string;
}

const caso = (
  tc: string,
  titulo: string,
  codigoDeRegla: string,
  regla: string,
  esperado: string,
): CasoTrazado => ({
  titulo: `${tc} | ${titulo}`,
  descripcion: descripcionHtml(`**Regla ${codigoDeRegla}.** ${regla}`, `**Resultado esperado.** ${esperado}`),
});

export const Casos = {
  login: {
    "TC-01": caso(
      "TC-01",
      "Validar acceso al catálogo con credenciales válidas",
      "BR1",
      'Con usuario y contraseña válidos el sistema da acceso y muestra el catálogo con el título "Products".',
      'Ingresa a /inventory.html y ve el título "Products".',
    ),
    "TC-02": caso(
      "TC-02",
      "Validar rechazo de un usuario bloqueado",
      "BR2",
      "Un usuario bloqueado no puede ingresar aunque su contraseña sea correcta.",
      'Permanece en el login con el mensaje "Epic sadface: Sorry, this user has been locked out."',
    ),
    "TC-03": caso(
      "TC-03",
      "Validar rechazo con contraseña incorrecta",
      "BR3",
      "Si el usuario no existe o la contraseña es incorrecta, el sistema muestra el mismo mensaje, sin indicar qué campo falló.",
      'Permanece en el login con el mensaje "Epic sadface: Username and password do not match any user in this service".',
    ),
    "TC-04": caso(
      "TC-04",
      "Validar rechazo con usuario inexistente",
      "BR3",
      "Si el usuario no existe o la contraseña es incorrecta, el sistema muestra el mismo mensaje, sin indicar qué campo falló.",
      "Permanece en el login con el mismo mensaje genérico que para la contraseña incorrecta.",
    ),
    "TC-05": caso(
      "TC-05",
      "Validar que el usuario es obligatorio",
      "BR4",
      "Usuario y contraseña son obligatorios.",
      'Mensaje "Epic sadface: Username is required".',
    ),
    "TC-06": caso(
      "TC-06",
      "Validar que la contraseña es obligatoria",
      "BR4",
      "Usuario y contraseña son obligatorios.",
      'Mensaje "Epic sadface: Password is required".',
    ),
  },
  compra: {
    "TC-01": caso(
      "TC-01",
      "Validar la compra completa de dos productos",
      "BR1 · BR2 · BR4",
      'El contador del carrito muestra la cantidad agregada, el resumen suma el impuesto del 8 % y la compra se confirma con "Thank you for your order!".',
      'El carrito muestra 2 productos, el total es subtotal + 8 % de impuesto y aparece "Thank you for your order!".',
    ),
    "TC-02": caso(
      "TC-02",
      "Validar que el nombre es obligatorio en el checkout",
      "BR3",
      "Nombre, apellido y código postal son obligatorios en el checkout.",
      'Mensaje "Error: First Name is required".',
    ),
    "TC-03": caso(
      "TC-03",
      "Validar que el apellido es obligatorio en el checkout",
      "BR3",
      "Nombre, apellido y código postal son obligatorios en el checkout.",
      'Mensaje "Error: Last Name is required".',
    ),
    "TC-04": caso(
      "TC-04",
      "Validar que el código postal es obligatorio en el checkout",
      "BR3",
      "Nombre, apellido y código postal son obligatorios en el checkout.",
      'Mensaje "Error: Postal Code is required".',
    ),
  },
  productos: {
    "TC-01": caso(
      "TC-01",
      "Validar el listado paginado de productos",
      "BR1",
      "GET /products?limit=N devuelve N productos con id, title, price y category, en menos de 3000 ms.",
      "Status 200, 5 productos dentro de products con id, title, price y category, respuesta en menos de 3000 ms.",
    ),
    "TC-02": caso(
      "TC-02",
      "Validar el detalle de un producto",
      "BR2",
      "GET /products/:id devuelve el producto pedido con su rating y su stock.",
      "Status 200, id=1, rating y stock numéricos.",
    ),
    "TC-03": caso(
      "TC-03",
      "Validar las categorías del catálogo",
      "BR3",
      "GET /products/categories devuelve las categorías vigentes, entre ellas beauty y laptops.",
      "Status 200 y la lista incluye las categorías beauty y laptops.",
    ),
    "TC-04": caso(
      "TC-04",
      "Validar el alta de un producto",
      "BR4",
      "POST /products/add crea el producto y responde 201 con su id.",
      "Status 201 y la respuesta incluye el id del producto.",
    ),
  },
  carritos: {
    "TC-01": caso(
      "TC-01",
      "Validar el listado de carritos con sus items",
      "BR1",
      "GET /carts?limit=N devuelve N carritos y cada item tiene id y quantity numéricos.",
      "Status 200, 3 carritos dentro de carts y cada item con id y quantity numéricos.",
    ),
    "TC-02": caso(
      "TC-02",
      "Validar el detalle de un carrito",
      "BR2",
      "GET /carts/:id devuelve el carrito pedido.",
      "Status 200 e id=1.",
    ),
    "TC-03": caso(
      "TC-03",
      "Validar el alta de un carrito con dos productos",
      "BR3",
      "POST /carts/add crea el carrito con sus productos y responde 201 con su id.",
      "Status 201 y la respuesta incluye el id del carrito.",
    ),
  },
} as const satisfies Record<string, Record<string, CasoTrazado>>;
