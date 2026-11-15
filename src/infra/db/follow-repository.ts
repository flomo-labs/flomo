import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { FollowStatus } from "@/contracts/follow";
import type { FollowRepository } from "@/domain/follow/ports";
import type { Tx } from "./client";
import { follows } from "./schema";

const FOREIGN_KEY_VIOLATION = "23503";
// Códigos do gatilho app.follows_rate_limit (migration 0025).
const FOLLOW_RATE_LIMITED = "FL001";
const FOLLOW_LIMIT_NOT_CONFIGURED = "FL002";

// O Drizzle embrulha o erro do driver em `cause`.
function hasErrorCode(error: unknown, expected: string): boolean {
  const code = (e: unknown) =>
    typeof e === "object" && e !== null && "code" in e ? e.code : undefined;
  return (
    code(error) === expected ||
    (error instanceof Error && code(error.cause) === expected)
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
          // Sem linha: o perfil (ou o vínculo) foi apagado entre o insert e a
          // leitura. Mesmo desfecho da violação da chave estrangeira.
          if (!row) return "not_found" as const;
          // O CHECK da tabela só deixa passar os valores de FollowStatus.
          return { status: row.status as FollowStatus };
        });
      } catch (error) {
        if (hasErrorCode(error, FOREIGN_KEY_VIOLATION)) {
          return "not_found" as const;
        }
        if (hasErrorCode(error, FOLLOW_RATE_LIMITED)) {
          return "rate_limited" as const;
        }
        if (hasErrorCode(error, FOLLOW_LIMIT_NOT_CONFIGURED)) {
          // Erro de configuração do ambiente, não do usuário: sobe como falha.
          throw new Error(
            "Limite de pedidos de seguir não configurado: grave ao menos uma linha em follow_limits (ver docs/regras-de-negocio.md).",
            { cause: error },
          );
        }
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

    async statusOf(followerId, followeeId) {
      const [row] = await tx
        .select({ status: follows.status })
        .from(follows)
        .where(pair(followerId, followeeId));
      // O CHECK da tabela só deixa passar os valores de FollowStatus.
      return row ? (row.status as FollowStatus) : null;
    },

    async relationsWith(viewerId, profileIds) {
      if (profileIds.length === 0) return [];
      const rows = await tx
        .select({
          followerId: follows.followerId,
          followeeId: follows.followeeId,
          status: follows.status,
        })
        .from(follows)
        .where(
          or(
            and(
              eq(follows.followerId, viewerId),
              inArray(follows.followeeId, profileIds),
            ),
            and(
              eq(follows.followeeId, viewerId),
              inArray(follows.followerId, profileIds),
            ),
          ),
        );
      return profileIds.map((profileId) => {
        const mine = rows.find(
          (r) => r.followerId === viewerId && r.followeeId === profileId,
        );
        const theirs = rows.find(
          (r) => r.followeeId === viewerId && r.followerId === profileId,
        );
        return {
          profileId,
          // O CHECK da tabela só deixa passar os valores de FollowStatus.
          following: mine ? (mine.status as FollowStatus) : null,
          followsViewer: theirs?.status === "accepted",
        };
      });
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
