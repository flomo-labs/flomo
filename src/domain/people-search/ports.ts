import type { PeopleSearchCursor } from "@/contracts/people-search";

// Uma pessoa achada na busca: nome, handle e foto são sempre visíveis, qualquer
// que seja a privacidade do perfil (mesma regra das listas de seguidores).
// `rank` é o grupo de relevância, que entra no cursor.
export type PersonSearchEntry = {
  profileId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  rank: number;
};

// Porta da busca de pessoas, implementada em infra/ (ADR-001). Quem aparece é
// decidido no banco: sem login, termo curto demais, o próprio usuário e quem
// tem bloqueio com ele (nos dois sentidos) não aparecem.
export interface PeopleSearchRepository {
  search(
    query: string,
    page: { limit: number; after: PeopleSearchCursor | null },
  ): Promise<PersonSearchEntry[]>;
}

export type PeopleSearchDeps = { people: PeopleSearchRepository };
