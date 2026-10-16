import type {
  CatalogEpisode,
  CatalogRef,
  CatalogTitle,
  ProviderTitle,
  SearchPage,
} from "./types";

// Portas do Catalog Gateway (ADR-001): o provedor de catálogo (hoje o TMDB,
// em infra/catalog/tmdb/) e o cache no Postgres (infra/db/). Trocar de
// provedor é escrever outro adaptador de `CatalogProvider`.

// O provedor está fora do ar, recusou a chave ou continuou limitando depois
// das novas tentativas. Os casos de uso traduzem para CATALOG_UNAVAILABLE.
export class CatalogUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CatalogUnavailableError";
  }
}

export interface CatalogProvider {
  search(query: string, page: number, locale: string): Promise<SearchPage>;
  // `null` quando o título não existe no provedor.
  fetchTitle(ref: CatalogRef, locale: string): Promise<ProviderTitle | null>;
}

export type Cached<T> = { value: T; expiresAt: Date };

export interface CatalogStore {
  readSearch(key: string): Promise<Cached<SearchPage> | null>;
  writeSearch(key: string, page: SearchPage, expiresAt: Date): Promise<void>;

  findTitleByRef(ref: CatalogRef): Promise<Cached<{ id: string }> | null>;
  readTitle(
    id: string,
    locale: string,
  ): Promise<Cached<{ title: CatalogTitle; ref: CatalogRef }> | null>;
  // Cria ou atualiza o título (e temporadas, episódios e gêneros) e devolve
  // o uuid dele. Temporadas e episódios que sumiram do provedor ficam, porque
  // o progresso dos usuários aponta para eles.
  writeTitle(title: ProviderTitle, expiresAt: Date): Promise<string>;

  // `null` quando o título não tem essa temporada.
  readEpisodes(
    titleId: string,
    seasonNumber: number,
  ): Promise<CatalogEpisode[] | null>;
}

export type CatalogDeps = {
  provider: CatalogProvider;
  store: CatalogStore;
  now: () => Date;
  // Agenda uma tarefa para depois da resposta (stale-while-revalidate). Quem
  // implementa trata os erros da tarefa (registrar, não derrubar a página).
  background: (task: () => Promise<unknown>) => void;
};
