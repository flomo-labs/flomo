import { and, eq, sql } from "drizzle-orm";
import type { BlockRepository } from "@/domain/block/ports";
import type { Tx } from "./client";
import { blocks } from "./schema";

const FOREIGN_KEY_VIOLATION = "23503";

// O Drizzle embrulha o erro do driver em `cause`.
function isForeignKeyViolation(error: unknown): boolean {
  const code = (e: unknown) =>
    typeof e === "object" && e !== null && "code" in e ? e.code : undefined;
  return (
    code(error) === FOREIGN_KEY_VIOLATION ||
    (error instanceof Error && code(error.cause) === FOREIGN_KEY_VIOLATION)
  );
}

// Roda dentro do `withUser`: o RLS só deixa enxergar e mexer nos bloqueios de
// quem bloqueou. O vínculo de seguir some pelo gatilho `blocks_remove_follows`
// (migration 0024).
export function createBlockRepository(tx: Tx): BlockRepository {
  const pair = (blockerId: string, blockedId: string) =>
    and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId));

  return {
    async insert(blockerId, blockedId) {
      try {
        // Savepoint: a violação da chave estrangeira (perfil inexistente)
        // desfaz só este insert, e a transação do `withUser` segue utilizável.
        await tx.transaction(async (sp) => {
          await sp
            .insert(blocks)
            .values({ blockerId, blockedId })
            .onConflictDoNothing();
        });
        return "ok" as const;
      } catch (error) {
        if (isForeignKeyViolation(error)) return "not_found" as const;
        throw error;
      }
    },

    async delete(blockerId, blockedId) {
      await tx.delete(blocks).where(pair(blockerId, blockedId));
    },

    async exists(blockerId, blockedId) {
      const rows = await tx
        .select({ blockedId: blocks.blockedId })
        .from(blocks)
        .where(pair(blockerId, blockedId));
      return rows.length > 0;
    },

    // Pela função `app.blocked_profiles` (migration 0024): a policy de
    // `profiles` esconde o perfil privado de outros, e a função devolve só
    // nome, handle e foto, e só os bloqueios do usuário logado.
    async list() {
      const rows = await tx.execute<{
        profile_id: string;
        handle: string;
        display_name: string | null;
        avatar_url: string | null;
        blocked_at: Date | string;
      }>(sql`select * from app.blocked_profiles()`);
      return [...rows].map((r) => ({
        profileId: r.profile_id,
        handle: r.handle,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        blockedAt: new Date(r.blocked_at),
      }));
    },
  };
}
