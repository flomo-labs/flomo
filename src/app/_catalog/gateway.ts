import "server-only";
import { after } from "next/server";
import type {
  CatalogRefInput,
  CatalogSearchInput,
  ShelfInput,
} from "@/contracts/catalog";
import { listShelf as listShelfUseCase } from "@/domain/catalog/list-shelf";
import { searchCatalog as searchCatalogUseCase } from "@/domain/catalog/search-catalog";
import {
  getTitle as getTitleUseCase,
  getTitleByRef as getTitleByRefUseCase,
  listSeasonEpisodes as listSeasonEpisodesUseCase,
} from "@/domain/catalog/titles";
import { getWatchProviders as getWatchProvidersUseCase } from "@/domain/catalog/watch-providers";
import { createCatalogDeps } from "@/infra/catalog";

// Borda do Catalog Gateway para a web (Server Components e Server Actions).
// O catálogo é público: não precisa de usuário. A atualização do cache
// vencido roda depois da resposta (`after`), sem atrasar a página.
function deps() {
  return createCatalogDeps((task) =>
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error("Falha ao atualizar o cache do catálogo:", error);
      }
    }),
  );
}

export function searchCatalog(input: CatalogSearchInput) {
  return searchCatalogUseCase(deps(), input);
}

export function getTitle(titleId: string) {
  return getTitleUseCase(deps(), { titleId });
}

export function getTitleByRef(ref: CatalogRefInput) {
  return getTitleByRefUseCase(deps(), ref);
}

export function listSeasonEpisodes(titleId: string, seasonNumber: number) {
  return listSeasonEpisodesUseCase(deps(), { titleId, seasonNumber });
}

export function getWatchProviders(titleId: string) {
  return getWatchProvidersUseCase(deps(), { titleId });
}

export function listShelf(input: ShelfInput) {
  return listShelfUseCase(deps(), input);
}
