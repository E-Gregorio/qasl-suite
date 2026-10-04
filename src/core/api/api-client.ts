import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { ContentType, attachment, withStep } from "@core/allure";
import {
  HEADERS_SENSIBLES,
  construirArchivoHttp,
  construirHtml,
  textoDeStatus,
  type HttpExchangeData,
} from "@core/api/http-exchange";

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  maxRedirects?: number;
}

export interface ApiResult<T> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: T;
  durationMs: number;
}

export interface ApiClientOptions {
  headersPorDefecto?: Record<string, string>;
  headersSensibles?: string[];
}

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export class ApiClient {
  private readonly headersPorDefecto: Record<string, string>;
  private readonly headersSensibles: string[];

  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
    options: ApiClientOptions = {},
  ) {
    this.headersPorDefecto = options.headersPorDefecto ?? {};
    this.headersSensibles = options.headersSensibles ?? HEADERS_SENSIBLES;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.enviar<T>("get", path, options);
  }

  async post<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.enviar<T>("post", path, options);
  }

  async put<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.enviar<T>("put", path, options);
  }

  async patch<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.enviar<T>("patch", path, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
    return this.enviar<T>("delete", path, options);
  }

  async verificarStatus<T>(resultado: ApiResult<T>, esperado: number): Promise<ApiResult<T>> {
    return withStep(`Verificar status ${esperado}`, async () => {
      expect(resultado.status, `Se esperaba ${esperado} y llego ${resultado.status}`).toBe(
        esperado,
      );
      return resultado;
    });
  }

  async verificarTiempoDeRespuesta<T>(
    resultado: ApiResult<T>,
    maximoMs: number,
  ): Promise<ApiResult<T>> {
    return withStep(`Verificar respuesta en menos de ${maximoMs} ms`, async () => {
      expect(
        resultado.durationMs,
        `Tardo ${resultado.durationMs} ms y el limite es ${maximoMs} ms`,
      ).toBeLessThan(maximoMs);
      return resultado;
    });
  }

  private construirUrl(path: string, params?: RequestOptions["params"]): string {
    const base = `${this.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
    if (!params) return base;
    const query = new URLSearchParams(
      Object.entries(params).map(([clave, valor]) => [clave, String(valor)]),
    );
    return `${base}?${query.toString()}`;
  }

  private async enviar<T>(
    metodo: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResult<T>> {
    const verbo = metodo.toUpperCase();
    const url = this.construirUrl(path, options.params);
    const requestHeaders = { ...this.headersPorDefecto, ...options.headers };
    if (options.data !== undefined && !requestHeaders["content-type"]) {
      requestHeaders["content-type"] = "application/json";
    }

    return withStep(`${verbo} ${path}`, async (contexto) => {
      const inicio = Date.now();
      const respuesta = await this.request[metodo](url, {
        headers: requestHeaders,
        data: options.data as never,
        maxRedirects: options.maxRedirects,
        failOnStatusCode: false,
      });
      const durationMs = Date.now() - inicio;

      const crudo = await respuesta.text();
      let body: T;
      try {
        body = crudo ? (JSON.parse(crudo) as T) : (undefined as T);
      } catch {
        body = crudo as unknown as T;
      }

      const status = respuesta.status();
      const datos: HttpExchangeData = {
        metodo: verbo,
        url,
        status,
        statusText: respuesta.statusText() || textoDeStatus(status),
        durationMs,
        requestHeaders,
        requestBody: options.data,
        responseHeaders: respuesta.headers(),
        responseBody: crudo,
      };

      await contexto.displayName(`${verbo} ${path} -> ${status} (${durationMs} ms)`);
      await contexto.parameter("status", String(status));
      await contexto.parameter("tiempo", `${durationMs} ms`);

      await attachment(
        `HTTP ${verbo} ${path}`,
        construirHtml(datos, this.headersSensibles),
        ContentType.HTML,
      );
      await attachment(
        `${verbo.toLowerCase()}-${path.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}.http`,
        construirArchivoHttp(datos, this.headersSensibles),
        ContentType.TEXT,
      );

      return {
        status,
        ok: respuesta.ok(),
        headers: datos.responseHeaders,
        body,
        durationMs,
      };
    });
  }
}
