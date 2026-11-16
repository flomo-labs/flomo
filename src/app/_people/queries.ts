import "server-only";
import {
  PEOPLE_SEARCH_PAGE_SIZE,
  type PeopleSearchCursor,
} from "@/contracts/people-search";
import { searchPeople } from "@/domain/people-search/search-people";
import { withUser } from "@/infra/db/client";
import { createFollowRepository } from "@/infra/db/follow-repository";
import { createPeopleSearchRepository } from "@/infra/db/people-search-repository";
import type { FollowListItem } from "@/components/follow/infinite-person-list";
import { createRateLimiter } from "@/lib/rate-limit";
import type { CurrentUser } from "../_auth/session";

// Freio por usuário na busca de pessoas: cada consulta varre perfis. Conta na
// memória de cada instância (src/lib/rate-limit.ts), então é um freio parcial,
// como o da carga de mais pessoas e o das sugestões da busca.
const checkSearchRate = createRateLimiter({
  limit: 30,
  windowMs: 60_000,
  maxKeys: 5000,
});

export type PeopleSearchPage =
  | {
      ok: true;
      items: FollowListItem[];
      nextCursor: PeopleSearchCursor | null;
      tooShort: boolean;
    }
  | { ok: false; code: "RATE_LIMITED" | "INVALID_INPUT" };

// Um trecho da busca depois do cursor `after` (`null` = começo), com a relação
// do usuário logado com cada pessoa (para o botão de seguir). Busca uma a mais
// que o trecho para saber se há mais; o `nextCursor` é o do último item.
export async function loadPeopleSearch(
  user: CurrentUser,
  query: string,
  after: PeopleSearchCursor | null,
): Promise<PeopleSearchPage> {
  if (!checkSearchRate(user.id, Date.now()).allowed) {
    return { ok: false, code: "RATE_LIMITED" };
  }
  return withUser(user.claims, async (tx) => {
    const result = await searchPeople(
      { people: createPeopleSearchRepository(tx) },
      { id: user.id },
      { query, limit: PEOPLE_SEARCH_PAGE_SIZE + 1, after },
    );
    if (!result.ok) return { ok: false, code: "INVALID_INPUT" } as const;
    const { people: all, tooShort } = result.value;
    const people = all.slice(0, PEOPLE_SEARCH_PAGE_SIZE);
    const last = people[people.length - 1];
    const relations = await createFollowRepository(tx).relationsWith(
      user.id,
      people.map((p) => p.profileId),
    );
    return {
      ok: true,
      tooShort,
      items: people.map((person) => {
        const relation = relations.find(
          (r) => r.profileId === person.profileId,
        );
        return {
          profileId: person.profileId,
          handle: person.handle,
          displayName: person.displayName,
          following: relation?.following ?? null,
          followsYou: relation?.followsViewer ?? false,
          isSelf: false,
        };
      }),
      nextCursor:
        last && all.length > PEOPLE_SEARCH_PAGE_SIZE
          ? { rank: last.rank, handle: last.handle }
          : null,
    } as const;
  });
}
