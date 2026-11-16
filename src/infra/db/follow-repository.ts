import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import type { FollowStatus } from "@/contracts/follow";
import type { FollowRepository } from "@/domain/follow/ports";
import type { Tx } from "./client";
import { blocks, follows } from "./schema";

const FOREIGN_KEY_VIOLATION = "23503";
// Códigos do gatilho app.follows_rate_limit (migration 0025).
const FOLLOW_RATE_LIMITED = "FL001";
const FOLLOW_LIMIT_NOT_CONFIGURED = "FL002";
// O gatilho app.follows_set_status recusa vínculo com bloqueio vigente com
// FL003 (migration 0029). Um 42501 aqui seria grant ou policy quebrado e sobe
// como erro, nunca como `not_found`.
// Só quem bloqueou recebe `blocked`; para quem foi bloqueado o resultado é
// `not_found`, igual a um perfil inexistente, para a ação não revelar o bloqueio.
const FOLLOW_BLOCKED = "FL003";

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
  cursor_at: string;
};

function toEntry(r: FollowListRow) {
  return {
    profileId: r.profile_id,
    handle: r.handle,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    followedAt: new Date(r.followed_at),
    cursorAt: r.cursor_at,
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
        if (hasErrorCode(error, FOLLOW_BLOCKED)) {
          // O savepoint já desfez o insert; a transação externa segue
          // utilizável. O RLS de `blocks` só mostra os bloqueios de quem pede.
          const [mine] = await tx
            .select({ blockedId: blocks.blockedId })
            .from(blocks)
            .where(
              and(
                eq(blocks.blockerId, followerId),
                eq(blocks.blockedId, followeeId),
              ),
            );
          return mine ? ("blocked" as const) : ("not_found" as const);
        }
        if (hasErrorCode(error, FOLLOW_RATE_LIMITED)) {
          return "rate_limited" as const;
        }
        if (hasErrorCode(error, FOLLOW_LIMIT_NOT_CONFIGURED)) {
          // Erro de configuração do ambiente, não do usuário: o caso de uso
          // devolve um código próprio e registra o motivo no log do servidor.
          console.error(
            "Limite de pedidos de seguir não configurado: grave ao menos uma linha em follow_limits (ver docs/regras-de-negocio.md).",
            error,
          );
          return "not_configured" as const;
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

    async removeFollower(followeeId, followerId) {
      const deleted = await tx
        .delete(follows)
        .where(
          and(pair(followerId, followeeId), eq(follows.status, "accepted")),
        )
        .returning({ followerId: follows.followerId });
      return deleted.length > 0;
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

    // Direto na tabela: o seguido lê a própria linha pelo RLS
    // (`follows_select_own`) e o índice (followee_id, status) cobre a conta.
    async countPending(followeeId) {
      const [row] = await tx
        .select({ total: count() })
        .from(follows)
        .where(
          and(
            eq(follows.followeeId, followeeId),
            eq(follows.status, "requested"),
          ),
        );
      return row?.total ?? 0;
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

    async listFollowers(profileId, { limit, after }) {
      const rows = await tx.execute<FollowListRow>(
        sql`select * from app.followers_of(${profileId}::uuid, ${limit}::integer, ${after?.at ?? null}::timestamptz, ${after?.id ?? null}::uuid)`,
      );
      return [...rows].map(toEntry);
    },

    async listFollowing(profileId, { limit, after }) {
      const rows = await tx.execute<FollowListRow>(
        sql`select * from app.following_of(${profileId}::uuid, ${limit}::integer, ${after?.at ?? null}::timestamptz, ${after?.id ?? null}::uuid)`,
      );
      return [...rows].map(toEntry);
    },
  };
}
