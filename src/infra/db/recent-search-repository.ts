import { and, eq, sql } from "drizzle-orm";
import type {
  RecentSearchItem,
  RecentSearchRepository,
} from "@/domain/recent-search/ports";
import type { Tx } from "./client";
import { recentSearches } from "./schema";

// Roda dentro do `withUser`: o RLS só deixa enxergar e mexer nas linhas do
// próprio usuário. O máximo de 8 e a repetição vêm do banco (gatilho
// `recent_searches_trim` e índice único da migration 0037); pessoa bloqueada
// some da lista pela função `app.recent_searches`.
export function createRecentSearchRepository(tx: Tx): RecentSearchRepository {
  // Linhas só do dono (o RLS já garante; o filtro deixa a intenção explícita).
  const mine = (userId: string) => eq(recentSearches.userId, userId);
  const touch = sql`clock_timestamp()`;

  return {
    async list() {
      const rows = await tx.execute<{
        kind: "query" | "title" | "person";
        term: string | null;
        media_type: "movie" | "tv" | null;
        external_id: string | null;
        title: string | null;
        year: string | null;
        poster_path: string | null;
        handle: string | null;
        display_name: string | null;
      }>(sql`select * from app.recent_searches()`);
      return [...rows].flatMap((r): RecentSearchItem[] => {
        if (r.kind === "query" && r.term !== null) {
          return [{ kind: "query", term: r.term }];
        }
        if (
          r.kind === "title" &&
          r.media_type !== null &&
          r.external_id !== null &&
          r.title !== null
        ) {
          return [
            {
              kind: "title",
              mediaType: r.media_type,
              externalId: r.external_id,
              title: r.title,
              year: r.year,
              posterPath: r.poster_path,
            },
          ];
        }
        if (r.kind === "person" && r.handle !== null) {
          return [
            {
              kind: "person",
              handle: r.handle,
              displayName: r.display_name,
            },
          ];
        }
        return [];
      });
    },

    async record(userId, item) {
      const target = [recentSearches.userId, recentSearches.dedupeKey];

      if (item.kind === "query") {
        await tx
          .insert(recentSearches)
          .values({ userId, kind: "query", term: item.term })
          // Mantém a grafia da última busca ("Dark" no lugar de "dark").
          .onConflictDoUpdate({
            target,
            set: { term: item.term, usedAt: touch },
          });
        return "ok";
      }

      if (item.kind === "title") {
        await tx
          .insert(recentSearches)
          .values({
            userId,
            kind: "title",
            mediaType: item.mediaType,
            externalId: item.externalId,
            title: item.title,
            year: item.year,
            posterPath: item.posterPath,
          })
          .onConflictDoUpdate({
            target,
            set: {
              title: item.title,
              year: item.year,
              posterPath: item.posterPath,
              usedAt: touch,
            },
          });
        return "ok";
      }

      const [found] = await tx.execute<{ id: string | null }>(
        sql`select app.find_recent_search_person(${item.handle}) as id`,
      );
      if (!found?.id) return "person_not_found";
      await tx
        .insert(recentSearches)
        .values({ userId, kind: "person", profileId: found.id })
        .onConflictDoUpdate({ target, set: { usedAt: touch } });
      return "ok";
    },

    async remove(userId, item) {
      if (item.kind === "query") {
        // Mesma regra de repetição do banco: sem diferenciar maiúsculas.
        await tx
          .delete(recentSearches)
          .where(
            and(
              mine(userId),
              eq(recentSearches.kind, "query"),
              sql`lower(${recentSearches.term}) = ${item.term.toLowerCase()}`,
            ),
          );
        return;
      }
      if (item.kind === "title") {
        await tx
          .delete(recentSearches)
          .where(
            and(
              mine(userId),
              eq(recentSearches.kind, "title"),
              eq(recentSearches.mediaType, item.mediaType),
              eq(recentSearches.externalId, item.externalId),
            ),
          );
        return;
      }
      // Pessoa: pelo handle atual, mesmo que ela tenha sido bloqueada depois
      // (o item some da lista, mas a linha continua e precisa poder sair).
      await tx.execute(
        sql`select app.delete_recent_search_person(${item.handle})`,
      );
    },

    async clear(userId) {
      await tx.delete(recentSearches).where(mine(userId));
    },
  };
}
