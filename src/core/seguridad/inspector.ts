import type { APIRequestContext } from "@playwright/test";
import { Step } from "@core/allure";
import { ApiClient, type ApiResult } from "@core/api/api-client";
import { adjuntarEsperadoObtenido, type FilaComparada } from "@core/evidencia/esperado-obtenido";

export class InspectorDeSeguridad {
  private readonly cifrado: ApiClient;
  private readonly sinCifrar: ApiClient;

  constructor(
    request: APIRequestContext,
    private readonly origen: string,
    private readonly ruta: string,
  ) {
    this.cifrado = new ApiClient(request, origen);
    this.sinCifrar = new ApiClient(request, origen.replace(/^https:/, "http:"));
  }

  @Step("Pedir {this.ruta} por HTTPS y leer sus cabeceras")
  async consultar(): Promise<ApiResult<unknown>> {
    return this.cifrado.get(this.ruta);
  }

  @Step("Pedir {this.ruta} por HTTP sin cifrar, sin seguir redirecciones")
  async consultarSinCifrar(): Promise<ApiResult<unknown>> {
    return this.sinCifrar.get(this.ruta, { maxRedirects: 0 });
  }

  @Step("Contrastar lo esperado con lo que respondio {this.origen}")
  async contrastar(titulo: string, filas: FilaComparada[]): Promise<void> {
    await adjuntarEsperadoObtenido(titulo, filas, "Respondio el servidor");
  }
}

export const cabecera = (resultado: ApiResult<unknown>, nombre: string): string | undefined =>
  resultado.headers[nombre.toLowerCase()];

export const ausente = "(ausente)";
