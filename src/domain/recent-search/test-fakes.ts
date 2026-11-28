import { RECENT_SEARCHES_MAX } from "@/contracts/recent-search";
import type { RecentSearchDeps, RecentSearchItem } from "./ports";

// Buscas recentes em memória para os testes de domínio (sem banco). Reproduz o
// que o banco garante: máximo, repetição e ordem. `knownHandles` são as
// pessoas que existem e podem ser encontradas.
export function createFakeRecentSearches(
  knownHandles: Record<string, string | null> = {},
) {
  const rows: { userId: string; item: RecentSearchItem }[] = [];

  const keyOf = (item: {
    kind: string;
    term?: string;
    mediaType?: string;
    externalId?: string;
    handle?: string;
  }) =>
    item.kind === "query"
      ? `q:${item.term?.toLowerCase()}`
      : item.kind === "title"
        ? `t:${item.mediaType}-${item.externalId}`
        : `p:${item.handle}`;

  const deps: RecentSearchDeps = {
    recentSearches: {
      async list(userId) {
        return rows.filter((r) => r.userId === userId).map((r) => r.item);
      },
      async record(userId, input) {
        let item: RecentSearchItem;
        if (input.kind === "person") {
          if (!(input.handle in knownHandles)) return "person_not_found";
          item = {
            kind: "person",
            handle: input.handle,
            displayName: knownHandles[input.handle],
          };
        } else {
          item = input;
        }
        const key = keyOf(item);
        const at = rows.findIndex(
          (r) => r.userId === userId && keyOf(r.item) === key,
        );
        if (at >= 0) rows.splice(at, 1);
        rows.unshift({ userId, item });
        const mine = rows.filter((r) => r.userId === userId);
        for (const extra of mine.slice(RECENT_SEARCHES_MAX)) {
          rows.splice(rows.indexOf(extra), 1);
        }
        return "ok";
      },
      async remove(userId, input) {
        const key = keyOf(input);
        const at = rows.findIndex(
          (r) => r.userId === userId && keyOf(r.item) === key,
        );
        if (at >= 0) rows.splice(at, 1);
      },
      async clear(userId) {
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].userId === userId) rows.splice(i, 1);
        }
      },
    },
  };
  return deps;
}
