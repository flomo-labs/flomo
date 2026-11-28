import type {
  RecentSearchInput,
  RemoveRecentSearchInput,
} from "@/contracts/recent-search";

// O que a lista de buscas recentes mostra. Nome e foto de pessoa vêm do perfil
// atual na hora da leitura.
export type RecentSearchItem =
  | { kind: "query"; term: string }
  | {
      kind: "title";
      mediaType: "movie" | "tv";
      externalId: string;
      title: string;
      year: string | null;
      posterPath: string | null;
    }
  | { kind: "person"; handle: string; displayName: string | null };

// Porta do histórico de buscas recentes, implementada em infra/ (ADR-001).
// Dentro do `withUser`, o RLS só deixa enxergar e mexer nas linhas do próprio
// usuário.
export interface RecentSearchRepository {
  // Do mais novo para o mais antigo, no máximo `RECENT_SEARCHES_MAX`. Item de
  // pessoa bloqueada (em qualquer sentido) ou que deixou de existir não volta.
  list(userId: string): Promise<RecentSearchItem[]>;

  // Coloca o item no topo; se já existe (mesma chave), só o traz para o topo e
  // atualiza o que a lista mostra. O que passa do máximo sai (o mais antigo).
  // `person_not_found` se a pessoa não existe, é o próprio usuário, está
  // bloqueada em qualquer sentido ou ainda tem handle provisório.
  record(
    userId: string,
    item: RecentSearchInput,
  ): Promise<"ok" | "person_not_found">;

  // Apaga um item; não falha se não há.
  remove(userId: string, item: RemoveRecentSearchInput): Promise<void>;

  // Apaga todos os itens do usuário.
  clear(userId: string): Promise<void>;
}

export type RecentSearchDeps = { recentSearches: RecentSearchRepository };
