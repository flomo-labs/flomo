import { and, eq, ne, sql } from "drizzle-orm";
import type { ProfileRepository } from "@/domain/profile/ports";
import type { Tx } from "./client";
import { profiles } from "./schema";

const UNIQUE_VIOLATION = "23505";

// O Drizzle embrulha o erro do driver em `cause`.
function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) =>
    typeof e === "object" && e !== null && "code" in e ? e.code : undefined;
  return (
    code(error) === UNIQUE_VIOLATION ||
    (error instanceof Error && code(error.cause) === UNIQUE_VIOLATION)
  );
}

// Mesma expressão do índice único profiles_handle_normalized_key.
const normalizedHandle = sql`replace(replace(${profiles.handle}, '.', ''), '_', '')`;

// Recebe a transação do `withUser`, nunca o cliente direto (ADR-003).
export function createProfileRepository(tx: Tx): ProfileRepository {
  return {
    async isHandleTaken(normalized, exceptUserId) {
      const rows = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(
          and(eq(normalizedHandle, normalized), ne(profiles.id, exceptUserId)),
        )
        .limit(1);
      return rows.length > 0;
    },

    async updateHandle(userId, handle) {
      try {
        // Savepoint: a violação do índice desfaz só este update, e a
        // transação do `withUser` continua utilizável.
        const rows = await tx.transaction((sp) =>
          sp
            .update(profiles)
            .set({ handle })
            .where(eq(profiles.id, userId))
            .returning({ id: profiles.id }),
        );
        return rows.length > 0 ? "updated" : "not_found";
      } catch (error) {
        if (isUniqueViolation(error)) return "taken";
        throw error;
      }
    },
  };
}

export type OwnProfile = {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
};

// Perfil do próprio usuário, para a borda decidir telas (ex.: primeiro acesso).
export async function findOwnProfile(
  tx: Tx,
  userId: string,
): Promise<OwnProfile | null> {
  const [row] = await tx
    .select({
      id: profiles.id,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, userId));
  return row ?? null;
}
