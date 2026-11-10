import { and, eq } from "drizzle-orm";
import type { FollowStatus } from "@/contracts/follow";
import type { FollowRepository } from "@/domain/follow/ports";
import type { Tx } from "./client";
import { follows } from "./schema";

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

// Roda dentro do `withUser`: o RLS limita as linhas a quem é seguidor ou
// seguido. O estado de nascimento é do gatilho `follows_set_status`.
export function createFollowRepository(tx: Tx): FollowRepository {
  const pair = (followerId: string, followeeId: string) =>
    and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId));

  return {
    async insert(followerId, followeeId) {
      try {
        // Savepoint: a violação da chave estrangeira (perfil inexistente)
        // desfaz só este insert, e a transação do `withUser` segue utilizável.
        return await tx.transaction(async (sp) => {
          await sp
            .insert(follows)
            .values({ followerId, followeeId })
            .onConflictDoNothing();
          const [row] = await sp
            .select({ status: follows.status })
            .from(follows)
            .where(pair(followerId, followeeId));
          // O CHECK da tabela só deixa passar os valores de FollowStatus.
          return { status: row.status as FollowStatus };
        });
      } catch (error) {
        if (isForeignKeyViolation(error)) return "not_found" as const;
        throw error;
      }
    },

    async delete(followerId, followeeId) {
      await tx.delete(follows).where(pair(followerId, followeeId));
    },

    async accept(followeeId, followerId) {
      const updated = await tx
        .update(follows)
        .set({ status: "accepted" })
        .where(
          and(pair(followerId, followeeId), eq(follows.status, "requested")),
        )
        .returning({ followerId: follows.followerId });
      if (updated.length > 0) return true;
      // Já aceito (duplo clique) também conta; sem vínculo, não.
      const rows = await tx
        .select({ status: follows.status })
        .from(follows)
        .where(pair(followerId, followeeId));
      return rows.length > 0;
    },

    async decline(followeeId, followerId) {
      await tx
        .delete(follows)
        .where(
          and(pair(followerId, followeeId), eq(follows.status, "requested")),
        );
    },
  };
}
