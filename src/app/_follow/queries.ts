import "server-only";
import type { FollowStatus } from "@/contracts/follow";
import { listFollowRequests } from "@/domain/follow/follow";
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
