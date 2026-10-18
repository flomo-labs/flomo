import type { MediaType } from "../catalog/types";
import type { CommentDeps, CommentRecord, CommentRepository } from "./ports";

// Comentários em memória para os testes de domínio (sem banco). A hora anda
// um segundo a cada gravação, o que dá a ordem do mais recente para o mais
// antigo.
export function createFakeComments(catalog: {
  titles?: Record<string, MediaType>;
}) {
  const rows: (CommentRecord & { userId: string })[] = [];
  let nextId = 1;
  let clock = Date.parse("2026-10-18T12:00:00Z");
  const tick = () => new Date((clock += 1000));

  const repo: CommentRepository = {
    async insert(userId, titleId, body, containsSpoilers) {
      const at = tick();
      const row = {
        id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
        userId,
        titleId,
        body,
        containsSpoilers,
        moderationStatus: "published" as const,
        createdAt: at,
        updatedAt: at,
      };
      rows.push(row);
      return strip(row);
    },
    async update(userId, commentId, body, containsSpoilers) {
      const row = rows.find((r) => r.id === commentId && r.userId === userId);
      if (!row) return undefined;
      // Como o trigger do banco: só edição de texto ou aviso muda a data.
      if (row.body !== body || row.containsSpoilers !== containsSpoilers) {
        row.updatedAt = tick();
      }
      row.body = body;
      row.containsSpoilers = containsSpoilers;
      return strip(row);
    },
    async delete(userId, commentId) {
      const i = rows.findIndex((r) => r.id === commentId && r.userId === userId);
      if (i >= 0) rows.splice(i, 1);
    },
    async listMine(userId, titleId) {
      return rows
        .filter((r) => r.userId === userId && r.titleId === titleId)
        .map(strip)
        .reverse();
    },
  };

  const deps: CommentDeps = {
    comments: repo,
    library: { findTitleMediaType: async (id) => catalog.titles?.[id] ?? null },
  };
  return { deps, rows };
}

function strip(row: CommentRecord & { userId: string }): CommentRecord {
  const { userId, ...record } = row;
  void userId;
  return record;
}
