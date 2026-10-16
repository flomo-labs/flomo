import {
  catalogRefSchema,
  seasonEpisodesInputSchema,
  titleIdSchema,
} from "@/contracts/catalog";
import { fail, ok, type Result } from "../result";
import {
  expiresAt,
  isExpired,
  MISSING_TITLE_RETRY_MS,
  titleTtlMs,
} from "./freshness";
import { CatalogUnavailableError, type CatalogDeps } from "./ports";
import { CATALOG_UNAVAILABLE_MESSAGE } from "./search-catalog";
import { singleFlight } from "./single-flight";
import {
  CATALOG_LOCALE,
  type CatalogEpisode,
  type CatalogRef,
  type CatalogTitle,
} from "./types";

export type TitleErrorCode =
  | "INVALID_INPUT"
  | "TITLE_NOT_FOUND"
  | "CATALOG_UNAVAILABLE";

const NOT_FOUND_MESSAGE = "Título não encontrado.";

// Busca o título no provedor e grava no banco. Devolve o uuid, ou `null` se
// o provedor não conhece o título.
function refreshTitle(deps: CatalogDeps, ref: CatalogRef) {
  return singleFlight(`title:${ref.mediaType}:${ref.externalId}`, async () => {
    const title = await deps.provider.fetchTitle(ref, CATALOG_LOCALE);
    if (!title) {
      await deps.store.postponeTitle(
        ref,
        expiresAt(deps.now(), MISSING_TITLE_RETRY_MS),
      );
      return null;
    }
    return deps.store.writeTitle(
      title,
      expiresAt(deps.now(), titleTtlMs(title)),
    );
  });
}

async function readOrRefreshInBackground(
  deps: CatalogDeps,
  id: string,
): Promise<CatalogTitle | null> {
  const cached = await deps.store.readTitle(id, CATALOG_LOCALE);
  if (!cached) return null;
  if (isExpired(cached.expiresAt, deps.now())) {
    const { ref } = cached.value;
    deps.background(() => refreshTitle(deps, ref));
  }
  return cached.value.title;
}

// Título pelo uuid do Flomo (página de título, biblioteca).
export async function getTitle(
  deps: CatalogDeps,
  input: unknown,
): Promise<Result<CatalogTitle, TitleErrorCode>> {
  const parsed = titleIdSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const title = await readOrRefreshInBackground(deps, parsed.data.titleId);
  return title ? ok(title) : fail("TITLE_NOT_FOUND", NOT_FOUND_MESSAGE);
}

// Título pela referência do provedor (resultado de busca ainda sem uuid):
// usa o banco quando já existe; senão traz do provedor e grava.
export async function getTitleByRef(
  deps: CatalogDeps,
  input: unknown,
): Promise<Result<CatalogTitle, TitleErrorCode>> {
  const parsed = catalogRefSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const ref = parsed.data;

  let id = (await deps.store.findTitleByRef(ref))?.id ?? null;
  if (!id) {
    try {
      id = await refreshTitle(deps, ref);
    } catch (error) {
      if (error instanceof CatalogUnavailableError) {
        return fail("CATALOG_UNAVAILABLE", CATALOG_UNAVAILABLE_MESSAGE);
      }
      throw error;
    }
    if (!id) return fail("TITLE_NOT_FOUND", NOT_FOUND_MESSAGE);
  }

  const title = await readOrRefreshInBackground(deps, id);
  return title ? ok(title) : fail("TITLE_NOT_FOUND", NOT_FOUND_MESSAGE);
}

// Episódios de uma temporada, lidos do banco (o título inteiro, com todas as
// temporadas, é gravado quando é trazido do provedor).
export async function listSeasonEpisodes(
  deps: CatalogDeps,
  input: unknown,
): Promise<Result<CatalogEpisode[], TitleErrorCode>> {
  const parsed = seasonEpisodesInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const episodes = await deps.store.readEpisodes(
    parsed.data.titleId,
    parsed.data.seasonNumber,
  );
  return episodes
    ? ok(episodes)
    : fail("TITLE_NOT_FOUND", "Temporada não encontrada.");
}
