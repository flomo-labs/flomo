import { and, eq, sql } from "drizzle-orm";
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

type FollowListRow = {
  profile_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  followed_at: Date | string;
};

function toEntry(r: FollowListRow) {
  return {
    profileId: r.profile_id,
    handle: r.handle,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    followedAt: new Date(r.followed_at),
  };
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

    // Pela função `app.pending_follow_requests` (migration 0022): a policy de
    // `profiles` esconde o perfil privado de quem pediu, e a função devolve só
    // nome, handle e foto, e só as solicitações do usuário logado.
    async listPending() {
      const rows = await tx.execute<{
        follower_id: string;
        handle: string;
        display_name: string | null;
        avatar_url: string | null;
        requested_at: Date | string;
      }>(sql`select * from app.pending_follow_requests()`);
      return [...rows].map((r) => ({
        followerId: r.follower_id,
        handle: r.handle,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        requestedAt: new Date(r.requested_at),
      }));
    },

    // Funções da migration 0023: o RLS de `follows` só mostra a linha a
    // seguidor e seguido, então contagens e listas passam por elas.
    async counts(profileId) {
      const rows = await tx.execute<{
        followers_count: number;
        following_count: number;
      }>(sql`select * from app.follow_counts(${profileId}::uuid)`);
      const [row] = [...rows];
      if (!row) return null;
      return {
        followers: row.followers_count,
        following: row.following_count,
      };
    },

    async listFollowers(profileId, { limit, offset }) {
      const rows = await tx.execute<FollowListRow>(
        sql`select * from app.followers_of(${profileId}::uuid, ${limit}::integer, ${offset}::integer)`,
      );
      return [...rows].map(toEntry);
    },

    async listFollowing(profileId, { limit, offset }) {
      const rows = await tx.execute<FollowListRow>(
        sql`select * from app.following_of(${profileId}::uuid, ${limit}::integer, ${offset}::integer)`,
      );
      return [...rows].map(toEntry);
    },
  };
}
