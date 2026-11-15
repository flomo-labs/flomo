import "server-only";
import type { FollowStatus } from "@/contracts/follow";
import {
  getFollowCounts,
  listFollowers,
  listFollowing,
  listFollowRequests,
} from "@/domain/follow/follow";
import { withUser } from "@/infra/db/client";
import { createFollowRepository } from "@/infra/db/follow-repository";
import type { CurrentUser } from "../_auth/session";

// Leituras para a página do perfil (as escritas ficam em actions.ts).

// Como o usuário logado se relaciona com o perfil: `null` se não segue.
export function loadFollowStatus(
  user: CurrentUser,
  profileId: string,
): Promise<FollowStatus | null> {
  return withUser(user.claims, (tx) =>
    createFollowRepository(tx).statusOf(user.id, profileId),
  );
}

// Se a pessoa do perfil segue o usuário logado (vínculo aceito; pedido
// pendente não conta). O RLS deixa o seguido ler a própria linha.
export async function loadFollowsMe(
  user: CurrentUser,
  profileId: string,
): Promise<boolean> {
  const status = await withUser(user.claims, (tx) =>
    createFollowRepository(tx).statusOf(profileId, user.id),
  );
  return status === "accepted";
}

// Solicitações pendentes feitas ao usuário logado, da mais recente à mais antiga.
export async function loadFollowRequests(user: CurrentUser) {
  const result = await withUser(user.claims, (tx) =>
    listFollowRequests(
      { follows: createFollowRepository(tx) },
      { id: user.id },
    ),
  );
  // Esta leitura não tem erro de negócio (`never`).
  return result.ok ? result.value.requests : [];
}

// Contagens de seguidores e de seguindo (só vínculos aceitos), visíveis a
// qualquer usuário logado, inclusive de perfil privado.
export async function loadFollowCounts(user: CurrentUser, profileId: string) {
  const result = await withUser(user.claims, (tx) =>
    getFollowCounts(
      { follows: createFollowRepository(tx) },
      { id: user.id },
      { profileId },
    ),
  );
  return result.ok ? result.value : { followers: 0, following: 0 };
}

export const FOLLOW_LIST_PAGE_SIZE = 30;

export type FollowListKind = "followers" | "following";

// Uma página da lista (do vínculo mais recente ao mais antigo) com a relação
// do usuário logado com cada pessoa, para os botões. Busca uma a mais que a
// página para saber se há próxima. Para quem não pode ver a lista volta vazia
// (a regra é do banco).
export async function loadFollowList(
  user: CurrentUser,
  profileId: string,
  kind: FollowListKind,
  page: number,
) {
  return withUser(user.claims, async (tx) => {
    const follows = createFollowRepository(tx);
    const input = {
      profileId,
      limit: FOLLOW_LIST_PAGE_SIZE + 1,
      offset: (page - 1) * FOLLOW_LIST_PAGE_SIZE,
    };
    const result = await (kind === "followers"
      ? listFollowers({ follows }, { id: user.id }, input)
      : listFollowing({ follows }, { id: user.id }, input));
    const all = result.ok ? result.value.people : [];
    const people = all.slice(0, FOLLOW_LIST_PAGE_SIZE);
    const relations = await follows.relationsWith(
      user.id,
      people.map((p) => p.profileId),
    );
    return {
      people: people.map((person) => ({
        ...person,
        relation: relations.find((r) => r.profileId === person.profileId),
      })),
      hasNext: all.length > FOLLOW_LIST_PAGE_SIZE,
    };
  });
}
