import {
  SUGGESTION_LIMIT,
  suggestionsInputSchema,
  type Suggestion,
} from "@/contracts/catalog";
import { fail, ok, type Result } from "../result";
import type { CatalogDeps } from "./ports";
import { searchCatalog, type SearchCatalogErrorCode } from "./search-catalog";

// Sugestões da busca: a primeira página da busca do catálogo (mesmo cache e
// mesma fila do TMDB), reduzida ao que a lista mostra.
export async function suggestTitles(
  deps: CatalogDeps,
  input: unknown,
): Promise<Result<Suggestion[], SearchCatalogErrorCode>> {
  const parsed = suggestionsInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const result = await searchCatalog(deps, { query: parsed.data.query });
  if (!result.ok) return result;
  return ok(
    result.value.items.slice(0, SUGGESTION_LIMIT).map((item) => ({
      mediaType: item.ref.mediaType,
      externalId: item.ref.externalId,
      title: item.title,
      year: item.releaseDate?.slice(0, 4) ?? null,
      posterPath: item.posterPath,
    })),
  );
}
