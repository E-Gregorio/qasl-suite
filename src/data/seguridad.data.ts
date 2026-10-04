import { descripcionHtml } from "@core/evidencia/descripcion";

export const Owasp = {
  criptografia: "A02:2021 · Fallas criptograficas",
  configuracion: "A05:2021 · Configuracion de seguridad incorrecta",
} as const;

export const FeaturesDeSeguridad = {
  web: "Seguridad · Tienda web",
  api: "Seguridad · API de la tienda",
} as const;

export const SuitesDeSeguridad = {
  web: "Seguridad · Tienda web",
  api: "Seguridad · API de la tienda",
} as const;

export const RedireccionesValidas = [301, 302, 307, 308] as const;

export const ClickjackingPermitido = ["DENY", "SAMEORIGIN"] as const;

export const PrefijoDeHallazgo = "Hallazgo de seguridad:";

export const ControlesDeSeguridad = {
  web: {
    https: {
      titulo: "SEC-01 | Validar que la tienda redirige HTTP a HTTPS",
      descripcion: descripcionHtml(
        "Quien entra por **http://** debe ser redirigido a **https://** antes de recibir contenido. Sin esa redireccion la sesion viaja sin cifrar.",
      ),
    },
    hsts: {
      titulo: "SEC-02 | Validar que la tienda declara Strict-Transport-Security",
      descripcion: descripcionHtml(
        "La cabecera **Strict-Transport-Security** obliga al navegador a usar siempre HTTPS con este sitio.",
      ),
    },
    nosniff: {
      titulo: "SEC-03 | Validar que la tienda declara X-Content-Type-Options: nosniff",
      descripcion: descripcionHtml(
        "Con **nosniff** el navegador no reinterpreta el tipo de contenido y evita ejecutar como script lo que no lo es.",
      ),
    },
    clickjacking: {
      titulo: "SEC-04 | Validar que la tienda impide ser embebida en un marco ajeno",
      descripcion: descripcionHtml(
        "**X-Frame-Options** (DENY o SAMEORIGIN) o la directiva **frame-ancestors** de la CSP impiden el clickjacking.",
      ),
    },
    csp: {
      titulo: "SEC-05 | Validar que la tienda declara Content-Security-Policy",
      descripcion: descripcionHtml(
        "La **Content-Security-Policy** limita de donde puede cargar scripts la pagina y reduce el impacto de un XSS.",
      ),
    },
    tecnologia: {
      titulo: "SEC-06 | Validar que la tienda no expone la tecnologia del servidor",
      descripcion: descripcionHtml(
        "Las cabeceras **X-Powered-By** y **Server** con version le dicen a un atacante que vulnerabilidades probar.",
      ),
    },
  },
  api: {
    https: {
      titulo: "SEC-07 | Validar que la API redirige HTTP a HTTPS",
      descripcion: descripcionHtml(
        "Una llamada por **http://** debe ser redirigida a **https://** antes de responder datos.",
      ),
    },
    nosniff: {
      titulo: "SEC-08 | Validar que la API declara X-Content-Type-Options: nosniff",
      descripcion: descripcionHtml(
        "Con **nosniff** una respuesta JSON no puede ser interpretada como HTML o script por el navegador.",
      ),
    },
    cors: {
      titulo: "SEC-09 | Validar que la API no abre CORS a cualquier origen con credenciales",
      descripcion: descripcionHtml(
        "**Access-Control-Allow-Origin: *** junto con **Access-Control-Allow-Credentials: true** permitiria a cualquier sitio leer respuestas autenticadas.",
      ),
    },
    tecnologia: {
      titulo: "SEC-10 | Validar que la API no expone la tecnologia del servidor",
      descripcion: descripcionHtml(
        "Las cabeceras **X-Powered-By** y **Server** con version le dicen a un atacante que vulnerabilidades probar.",
      ),
    },
  },
} as const;
