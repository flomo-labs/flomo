import type { FollowStatus } from "@/contracts/follow";
import type { FollowDeps } from "./ports";

// Vínculos em memória para os testes de domínio (sem banco). `privateIds`
// imita o gatilho do banco: seguir perfil privado nasce `requested`.
export function createFakeFollows(world: {
  profiles: string[];
  privateIds?: string[];
  // Dados de exibição de quem pede (o fake gera um padrão se faltar).
  people?: Record<
    string,
    { handle: string; displayName: string | null; avatarUrl: string | null }
  >;
}) {
  const rows: {
    followerId: string;
    followeeId: string;
    status: FollowStatus;
    requestedAt: Date;
  }[] = [];
  let tick = 0;
  const find = (followerId: string, followeeId: string) =>
    rows.find(
      (r) => r.followerId === followerId && r.followeeId === followeeId,
    );

  const deps: FollowDeps = {
    follows: {
      async insert(followerId, followeeId) {
        if (!world.profiles.includes(followeeId)) return "not_found";
        const existing = find(followerId, followeeId);
        if (existing) return { status: existing.status };
        const status = world.privateIds?.includes(followeeId)
          ? "requested"
          : "accepted";
        rows.push({
          followerId,
          followeeId,
          status,
          requestedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)),
        });
        return { status };
      },
      async delete(followerId, followeeId) {
        const i = rows.findIndex(
          (r) => r.followerId === followerId && r.followeeId === followeeId,
        );
        if (i >= 0) rows.splice(i, 1);
      },
      async accept(followeeId, followerId) {
        const row = find(followerId, followeeId);
        if (!row) return false;
        row.status = "accepted";
        return true;
      },
      async decline(followeeId, followerId) {
        const i = rows.findIndex(
          (r) =>
            r.followerId === followerId &&
            r.followeeId === followeeId &&
            r.status === "requested",
        );
        if (i >= 0) rows.splice(i, 1);
      },
      async listPending(followeeId) {
        return rows
          .filter(
            (r) => r.followeeId === followeeId && r.status === "requested",
          )
          .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
          .map((r) => ({
            followerId: r.followerId,
            handle: world.people?.[r.followerId]?.handle ?? `u-${r.followerId}`,
            displayName: world.people?.[r.followerId]?.displayName ?? null,
            avatarUrl: world.people?.[r.followerId]?.avatarUrl ?? null,
            requestedAt: r.requestedAt,
          }));
      },
    },
  };
  return { deps, rows };
}
