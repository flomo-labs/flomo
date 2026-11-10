import "server-only";
import { hasBlocked, listBlockedPeople } from "@/domain/block/block";
import { withUser } from "@/infra/db/client";
import { createBlockRepository } from "@/infra/db/block-repository";
import type { CurrentUser } from "../_auth/session";

// Leituras para o perfil e para Configurações (as escritas ficam em
// actions.ts).

// O usuário logado bloqueou esta pessoa?
export async function loadHasBlocked(
  user: CurrentUser,
  profileId: string,
): Promise<boolean> {
  const result = await withUser(user.claims, (tx) =>
    hasBlocked(
      { blocks: createBlockRepository(tx) },
      { id: user.id },
      {
        profileId,
      },
    ),
  );
  return result.ok && result.value.blocked;
}

// Pessoas que o usuário logado bloqueou, do bloqueio mais recente ao mais
// antigo.
export async function loadBlockedPeople(user: CurrentUser) {
  const result = await withUser(user.claims, (tx) =>
    listBlockedPeople({ blocks: createBlockRepository(tx) }, { id: user.id }),
  );
  // Esta leitura não tem erro de negócio (`never`).
  return result.ok ? result.value.people : [];
}
