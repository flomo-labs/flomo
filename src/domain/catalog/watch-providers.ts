import { titleIdSchema } from "@/contracts/catalog";
import { fail, ok, type Result } from "../result";
import { expiresAt, isExpired, WATCH_PROVIDERS_TTL_MS } from "./freshness";
import { CatalogUnavailableError, type CatalogDeps } from "./ports";
import { CATALOG_UNAVAILABLE_MESSAGE } from "./search-catalog";
import { singleFlight } from "./single-flight";
import { CATALOG_COUNTRY, type CatalogRef, type WatchProviders } from "./types";

export type WatchProvidersErrorCode =
  | "INVALID_INPUT"
  | "TITLE_NOT_FOUND"
  | "CATALOG_UNAVAILABLE";

function cacheKey(ref: CatalogRef) {
  return `providers:${CATALOG_COUNTRY}:${ref.mediaType}/${ref.externalId}`;
}

// Onde assistir um título no Brasil. Responde do cache quando pode; com o
// cache vencido, responde com ele e atualiza em segundo plano. Só funciona
// para título já gravado (o uuid vem da página do título).
export async function getWatchProviders(
  deps: CatalogDeps,
  input: unknown,
): Promise<Result<WatchProviders, WatchProvidersErrorCode>> {
  const parsed = titleIdSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const saved = await deps.store.readTitle(parsed.data.titleId, "pt-BR");
  if (!saved) return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  const { ref } = saved.value;
  const key = cacheKey(ref);

  // `kept`: dado vencido já gravado. Se o provedor deixou de conhecer o
  // título, adia a próxima tentativa em vez de buscar a cada visita.
  const fetchAndStore = (kept?: WatchProviders) =>
    singleFlight(key, async () => {
      const result = await deps.provider.fetchWatchProviders(
        ref,
        CATALOG_COUNTRY,
      );
      if (!result) {
        if (kept) {
          await deps.store.writeWatchProviders(
            key,
            kept,
            expiresAt(deps.now(), WATCH_PROVIDERS_TTL_MS),
          );
        }
        return null;
      }
      await deps.store.writeWatchProviders(
        key,
        result,
        expiresAt(deps.now(), WATCH_PROVIDERS_TTL_MS),
      );
      return result;
    });

  const cached = await deps.store.readWatchProviders(key);
  if (cached) {
    if (isExpired(cached.expiresAt, deps.now())) {
      deps.background(() => fetchAndStore(cached.value));
    }
    return ok(cached.value);
  }

  try {
    const result = await fetchAndStore();
    return result
      ? ok(result)
      : fail("TITLE_NOT_FOUND", "Título não encontrado.");
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      return fail("CATALOG_UNAVAILABLE", CATALOG_UNAVAILABLE_MESSAGE);
    }
    throw error;
  }
}
