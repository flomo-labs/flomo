import type { BlockDeps } from "./ports";

// Bloqueios em memória para os testes de domínio (sem banco).
export function createFakeBlocks(world: {
  profiles: string[];
  people?: Record<
    string,
    { handle: string; displayName: string | null; avatarUrl: string | null }
  >;
}) {
  const rows: { blockerId: string; blockedId: string; blockedAt: Date }[] = [];
  let tick = 0;

  const deps: BlockDeps = {
    blocks: {
      async insert(blockerId, blockedId) {
        if (!world.profiles.includes(blockedId)) return "not_found";
        if (
          !rows.some(
            (r) => r.blockerId === blockerId && r.blockedId === blockedId,
          )
        ) {
          rows.push({
            blockerId,
            blockedId,
            blockedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)),
          });
        }
        return "ok";
      },
      async delete(blockerId, blockedId) {
        const i = rows.findIndex(
          (r) => r.blockerId === blockerId && r.blockedId === blockedId,
        );
        if (i >= 0) rows.splice(i, 1);
      },
      async exists(blockerId, blockedId) {
        return rows.some(
          (r) => r.blockerId === blockerId && r.blockedId === blockedId,
        );
      },
      async list(blockerId) {
        return rows
          .filter((r) => r.blockerId === blockerId)
          .sort((a, b) => b.blockedAt.getTime() - a.blockedAt.getTime())
          .map((r) => ({
            profileId: r.blockedId,
            handle: world.people?.[r.blockedId]?.handle ?? `u-${r.blockedId}`,
            displayName: world.people?.[r.blockedId]?.displayName ?? null,
            avatarUrl: world.people?.[r.blockedId]?.avatarUrl ?? null,
            blockedAt: r.blockedAt,
          }));
      },
    },
  };
  return { deps, rows };
}
