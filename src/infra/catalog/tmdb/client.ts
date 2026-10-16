import { CatalogUnavailableError } from "@/domain/catalog/ports";
import { createLimiter } from "../limiter";

// Cliente HTTP da API v3 do TMDB, só no servidor (a chave nunca vai para o
// navegador; quem expõe o gateway para a web é `app/_catalog`, com
// `server-only`). Limita as chamadas simultâneas e tenta de novo quando o TMDB
// responde 429, respeitando o `Retry-After`.

const BASE_URL = "https://api.themoviedb.org/3";

export type TmdbClientOptions = {
  // Token de leitura (v4, enviado como Bearer) ou chave da API (v3, enviada
  // como `api_key`). O token é o recomendado: não aparece na URL.
  credential: string;
  maxConcurrent?: number;
  maxRetries?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export type TmdbClient = {
  // `null` quando o recurso não existe (404).
  get(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<unknown | null>;
};

const MAX_RETRY_WAIT_MS = 10_000;

// O token de leitura é um JWT; a chave v3 é um hexadecimal de 32 caracteres.
export function isReadAccessToken(credential: string): boolean {
  return credential.startsWith("eyJ");
}

// Segundos (`Retry-After: 2`) ou data HTTP. Sem o cabeçalho, espera
// exponencial: 1 s, 2 s, 4 s...
export function retryDelayMs(
  retryAfter: string | null,
  attempt: number,
  now = Date.now(),
): number {
  let delay = 1000 * 2 ** attempt;
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      delay = seconds * 1000;
    } else {
      const date = Date.parse(retryAfter);
      if (!Number.isNaN(date)) delay = Math.max(0, date - now);
    }
  }
  return Math.min(delay, MAX_RETRY_WAIT_MS);
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createTmdbClient(options: TmdbClientOptions): TmdbClient {
  const {
    credential,
    maxConcurrent = 8,
    maxRetries = 3,
    timeoutMs = 8000,
    fetch: doFetch = fetch,
    sleep = defaultSleep,
  } = options;
  if (!credential) {
    throw new Error(
      "Defina TMDB_READ_ACCESS_TOKEN ou TMDB_API_KEY (somente no servidor).",
    );
  }
  const bearer = isReadAccessToken(credential);
  const limiter = createLimiter(maxConcurrent);
  const headers: Record<string, string> = { accept: "application/json" };
  if (bearer) headers.authorization = `Bearer ${credential}`;

  return {
    async get(path, params = {}) {
      const url = new URL(`${BASE_URL}/${path.replace(/^\//, "")}`);
      for (const [name, value] of Object.entries(params)) {
        url.searchParams.set(name, String(value));
      }
      if (!bearer) url.searchParams.set("api_key", credential);

      // As mensagens de erro citam só o caminho, nunca a URL (que pode ter a
      // chave v3).
      for (let attempt = 0; ; attempt++) {
        let response: Response;
        try {
          response = await limiter.run(() =>
            doFetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) }),
          );
        } catch {
          throw new CatalogUnavailableError(
            `TMDB inacessível ou sem resposta em ${path}.`,
          );
        }

        if (response.status === 429 && attempt < maxRetries) {
          await response.body?.cancel();
          // Espera fora do limitador, para não segurar a vaga.
          await sleep(
            retryDelayMs(response.headers.get("retry-after"), attempt),
          );
          continue;
        }
        if (response.status === 404) {
          await response.body?.cancel();
          return null;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new CatalogUnavailableError(
            response.status === 401
              ? "O TMDB recusou a chave (confira TMDB_API_KEY)."
              : `TMDB respondeu ${response.status} em ${path}.`,
          );
        }
        try {
          return await response.json();
        } catch {
          throw new CatalogUnavailableError(
            `Resposta inválida do TMDB em ${path}.`,
          );
        }
      }
    },
  };
}
