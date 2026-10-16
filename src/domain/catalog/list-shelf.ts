import { shelfInputSchema } from "@/contracts/catalog";
import { fail, ok, type Result } from "../result";
import { expiresAt, isExpired, SHELF_TTL_MS } from "./freshness";
import { CatalogUnavailableError, type CatalogDeps } from "./ports";
import { CATALOG_UNAVAILABLE_MESSAGE } from "./search-catalog";
import { singleFlight } from "./single-flight";
import {
  CATALOG_COUNTRY,
  CATALOG_LOCALE,
  SHELF_SIZE,
  type SearchItem,
  type ShelfQuery,
} from "./types";

export type ListShelfErrorCode = "INVALID_INPUT" | "CATALOG_UNAVAILABLE";

function cacheKey(query: ShelfQuery) {
  const base = `shelf:${CATALOG_LOCALE}:${CATALOG_COUNTRY}:${query.kind}`;
  return query.kind === "provider"
    ? `${base}:${query.mediaType}:${query.providerId}`
    : base;
}

// Prateleiras da Home pública (em alta, nos cinemas, em alta no serviço X).
// Mesmo cache das buscas: responde do Postgres e, vencido o prazo, responde
// com o gravado e atualiza em segundo plano. Itens são referências: o título
// só ganha uuid quando alguém o abre.
export async function listShelf(
  deps: CatalogDeps,
  input: unknown,
): Promise<Result<SearchItem[], ListShelfErrorCode>> {
  const parsed = shelfInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Prateleira inválida.");
  const query = parsed.data;
  const key = cacheKey(query);

  const fetchAndStore = () =>
    singleFlight(key, async () => {
      const items = await deps.provider.fetchShelf(
        query,
        CATALOG_COUNTRY,
        CATALOG_LOCALE,
        SHELF_SIZE,
      );
      await deps.store.writeShelf(
        key,
        items,
        expiresAt(deps.now(), SHELF_TTL_MS),
      );
      return items;
    });

  const cached = await deps.store.readShelf(key);
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
