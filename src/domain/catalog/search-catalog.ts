import { catalogSearchInputSchema } from "@/contracts/catalog";
import { fail, ok, type Result } from "../result";
import { expiresAt, isExpired, SEARCH_TTL_MS } from "./freshness";
import { CatalogUnavailableError, type CatalogDeps } from "./ports";
import { singleFlight } from "./single-flight";
import { CATALOG_LOCALE, type SearchPage } from "./types";

export type SearchCatalogErrorCode = "INVALID_INPUT" | "CATALOG_UNAVAILABLE";

export const CATALOG_UNAVAILABLE_MESSAGE =
  "O catálogo está indisponível no momento. Tente de novo em instantes.";

// "  Breaking   BAD " e "breaking bad" são a mesma busca (e a mesma linha
// de cache).
export function normalizeSearchQuery(query: string): string {
  return query
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase(CATALOG_LOCALE);
}

// Busca de filmes e séries pelo Catalog Gateway: responde do cache quando
// pode; com o cache vencido, responde com ele e atualiza em segundo plano.
export async function searchCatalog(
  deps: CatalogDeps,
  input: unknown,
): Promise<Result<SearchPage, SearchCatalogErrorCode>> {
  const parsed = catalogSearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const query = normalizeSearchQuery(parsed.data.query);
  const { page } = parsed.data;
  const key = `search:${CATALOG_LOCALE}:${page}:${query}`;

  const fetchAndStore = () =>
    singleFlight(key, async () => {
      const result = await deps.provider.search(query, page, CATALOG_LOCALE);
      await deps.store.writeSearch(
        key,
        result,
        expiresAt(deps.now(), SEARCH_TTL_MS),
      );
      return result;
    });

  const cached = await deps.store.readSearch(key);
  if (cached) {
    if (isExpired(cached.expiresAt, deps.now())) {
      deps.background(fetchAndStore);
    }
    return ok(cached.value);
  }

  try {
    return ok(await fetchAndStore());
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      return fail("CATALOG_UNAVAILABLE", CATALOG_UNAVAILABLE_MESSAGE);
    }
    throw error;
  }
}
