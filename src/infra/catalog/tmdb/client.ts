import { CatalogUnavailableError } from "@/domain/catalog/ports";
import { createLimiter } from "../limiter";

// Cliente HTTP da API v3 do TMDB, só no servidor (a chave nunca vai para o
// navegador; quem expõe o gateway para a web é `app/_catalog`, com
// `server-only`). Limita as chamadas simultâneas e tenta de novo quando o TMDB
// responde 429, respeitando o `Retry-After`.

const DEFAULT_BASE_URL = "https://api.themoviedb.org/3";

// URL do TMDB falso do E2E. Vazia em produção; só aceita endereço local, para
// que um valor errado no ambiente não mande a credencial para outro servidor.
export function localTmdbBaseUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const { hostname } = new URL(value);
    if (hostname === "localhost" || hostname === "127.0.0.1") return value;
  } catch {
    // cai no aviso abaixo
  }
  console.error("TMDB_BASE_URL ignorada: só vale endereço local (E2E).");
  return undefined;
}

export type TmdbClientOptions = {
  // Token de leitura (v4, enviado como Bearer) ou chave da API (v3, enviada
  // como `api_key`). O token é o recomendado: não aparece na URL.
  credential: string;
  // Só o E2E troca (TMDB falso em e2e/tmdb-fake/); o padrão é a API real.
  baseUrl?: string;
  maxConcurrent?: number;
  maxRetries?: number;
  timeoutMs?: number;
  // Soma máxima das esperas por 429 num pedido: passou disso, desiste em vez
  // de prender a página.
  totalBudgetMs?: number;
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

type Attempt =
  | { kind: "ok"; data: unknown }
  | { kind: "not_found" }
  | { kind: "retry"; retryAfter: string | null };

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
    baseUrl = DEFAULT_BASE_URL,
    maxConcurrent = 8,
    maxRetries = 3,
    timeoutMs = 8000,
    totalBudgetMs = 15_000,
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
      const url = new URL(
        `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
      );
      for (const [name, value] of Object.entries(params)) {
        url.searchParams.set(name, String(value));
      }
      if (!bearer) url.searchParams.set("api_key", credential);

      // As mensagens de erro citam só o caminho, nunca a URL (que pode ter a
      // chave v3).
      const unavailable = (reason: string) =>
        new CatalogUnavailableError(`${reason} (${path}).`);

      // Uma tentativa inteira (inclusive a leitura do corpo) ocupa uma vaga
      // do limitador.
      const attemptOnce = () =>
        limiter.run(async (): Promise<Attempt> => {
          let response: Response;
          try {
            response = await doFetch(url, {
              headers,
              signal: AbortSignal.timeout(timeoutMs),
            });
          } catch {
            throw unavailable("TMDB inacessível ou sem resposta");
          }
          if (response.status === 429) {
            await response.body?.cancel();
            return {
              kind: "retry",
              retryAfter: response.headers.get("retry-after"),
            };
          }
          if (response.status === 404) {
            await response.body?.cancel();
            return { kind: "not_found" };
          }
          if (!response.ok) {
            await response.body?.cancel();
            throw response.status === 401
              ? unavailable(
                  "O TMDB recusou a credencial (confira TMDB_READ_ACCESS_TOKEN ou TMDB_API_KEY)",
                )
              : unavailable(`TMDB respondeu ${response.status}`);
          }
          try {
            return { kind: "ok", data: await response.json() };
          } catch {
            throw unavailable("Resposta inválida do TMDB");
          }
        });

      let waited = 0;
      for (let attempt = 0; ; attempt++) {
        const result = await attemptOnce();
        if (result.kind === "ok") return result.data;
        if (result.kind === "not_found") return null;

        // 429: espera fora do limitador, para não segurar a vaga, e desiste
        // se a espera estourar o prazo total do pedido.
        const delay = retryDelayMs(result.retryAfter, attempt);
        if (attempt >= maxRetries || waited + delay > totalBudgetMs) {
          throw unavailable("TMDB continua limitando as chamadas (429)");
        }
        waited += delay;
        await sleep(delay);
      }
    },
  };
}
