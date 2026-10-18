import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import {
  episodes,
  profiles,
  ratings,
  seasons,
  titles,
  userEpisodeProgress,
  userTitles,
  watchEvents,
} from "./schema";

// Exercita a migration 0016: CHECKs de nome e bio, trigger de cadastro com o
// nome cortado e a função app.profile_stats (quem pode ver e o que ela conta).
afterAll(closeTestDb);

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

type Stats = {
  series_count: number;
  movies_count: number;
  episodes_count: number;
  minutes_watched: string;
  ratings_count: number;
};

function statsOf(tx: Tx, profileId: string) {
  return tx.execute<Stats>(
    sql`select * from app.profile_stats(${profileId}::uuid)`,
  );
}

// Série com dois episódios (um com duração própria, outro sem: usa a da
// série) e um filme de 120 minutos.
async function createCatalog(tx: Tx) {
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série de teste", runtime: 40 })
    .returning({ id: titles.id });
  const [movie] = await tx
    .insert(titles)
    .values({
      mediaType: "movie",
      originalTitle: "Filme de teste",
      runtime: 120,
    })
    .returning({ id: titles.id });
  const [season] = await tx
    .insert(seasons)
    .values({ titleId: series.id, seasonNumber: 1 })
    .returning({ id: seasons.id });
  const [ep1, ep2] = await tx
    .insert(episodes)
    .values([
      { seasonId: season.id, episodeNumber: 1, runtime: 50 },
      { seasonId: season.id, episodeNumber: 2 },
    ])
    .returning({ id: episodes.id });
  return { seriesId: series.id, movieId: movie.id, ep1: ep1.id, ep2: ep2.id };
}

// Série e filme na biblioteca, dois episódios vistos, o filme visto duas
// vezes e uma nota no filme.
async function seed(
  tx: Tx,
  userId: string,
  c: Awaited<ReturnType<typeof createCatalog>>,
) {
  await asUser(tx, userId, async (utx) => {
    await utx.insert(userTitles).values([
      { userId, titleId: c.seriesId, status: "watching" },
      { userId, titleId: c.movieId, status: "watched" },
    ]);
    for (const episodeId of [c.ep1, c.ep2]) {
      await utx.insert(userEpisodeProgress).values({
        userId,
        episodeId,
        titleId: c.seriesId,
        watchedAt: new Date(),
      });
    }
    for (let i = 0; i < 2; i++) {
      await utx.insert(watchEvents).values({
        userId,
        titleId: c.movieId,
        watchedAt: new Date(),
        watchedAtPrecision: "exact",
        source: "live",
      });
    }
    await utx
      .insert(ratings)
      .values({ userId, titleId: c.movieId, halfStars: 7 });
  });
}

describe("app.profile_stats", () => {
  it("conta séries, filmes, episódios, minutos e notas do próprio perfil", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      await seed(tx, owner, await createCatalog(tx));

      const rows = await asUser(tx, owner, (utx) => statsOf(utx, owner));
      expect([...rows]).toEqual([
        {
          series_count: 1,
          movies_count: 1,
          episodes_count: 2,
          // 50 + 40 (sem duração: a da série) + 120 (filme revisto conta uma vez)
          minutes_watched: "210",
          ratings_count: 1,
        },
      ]);
    }));

  it("não conta título oculto nem tirado da biblioteca", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const c = await createCatalog(tx);
      await seed(tx, owner, c);
      await tx
        .update(userTitles)
        .set({ hidden: true })
        .where(eq(userTitles.titleId, c.movieId));
      await tx.delete(userTitles).where(eq(userTitles.titleId, c.seriesId));

      const rows = await asUser(tx, owner, (utx) => statsOf(utx, owner));
      expect([...rows]).toEqual([
        {
          series_count: 0,
          movies_count: 0,
          episodes_count: 0,
          minutes_watched: "0",
          ratings_count: 0,
        },
      ]);
    }));

  it("responde zeros para perfil sem nada marcado", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const rows = await asUser(tx, owner, (utx) => statsOf(utx, owner));
      expect([...rows]).toEqual([
        {
          series_count: 0,
          movies_count: 0,
          episodes_count: 0,
          minutes_watched: "0",
          ratings_count: 0,
        },
      ]);
    }));

  it("outro usuário vê os números de perfil público, mas não de privado", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      await seed(tx, owner, await createCatalog(tx));

      const asPublic = await asUser(tx, other, (utx) => statsOf(utx, owner));
      expect(asPublic).toHaveLength(1);
      expect(asPublic[0].episodes_count).toBe(2);

      await tx
        .update(profiles)
        .set({ isPrivate: true })
        .where(eq(profiles.id, owner));
      const asPrivate = await asUser(tx, other, (utx) => statsOf(utx, owner));
      expect(asPrivate).toHaveLength(0);

      // O dono continua vendo os próprios números com o perfil privado.
      const asOwner = await asUser(tx, owner, (utx) => statsOf(utx, owner));
      expect(asOwner).toHaveLength(1);
    }));

  it("não responde para perfil que não existe", () =>
    inRollback(async (tx) => {
      const viewer = await createUser(tx);
      const rows = await asUser(tx, viewer, (utx) =>
        statsOf(utx, "00000000-0000-4000-8000-000000000000"),
      );
      expect(rows).toHaveLength(0);
    }));

  it("sem usuário na requisição não responde, mesmo com o papel authenticated", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const rows = await tx.transaction(async (sp) => {
        await sp.execute(sql`set local role authenticated`);
        return statsOf(sp, owner);
      });
      expect(rows).toHaveLength(0);
    }));

  it("anon não pode chamar a função", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await statsOf(sp, owner);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));
});

describe("nome de exibição e bio", () => {
  it("aceitam até 50 e 160 caracteres e recusam acima disso", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const update = (values: Partial<typeof profiles.$inferInsert>) =>
        asUser(tx, owner, (utx) =>
          utx.update(profiles).set(values).where(eq(profiles.id, owner)),
        );

      await update({ displayName: "n".repeat(50), bio: "b".repeat(160) });
      // Conta caracteres, não bytes: emoji e acento valem um.
      await update({ displayName: "é".repeat(49) + "🎬" });

      for (const values of [
        { displayName: "n".repeat(51) },
        { bio: "b".repeat(161) },
        { displayName: "" },
        { displayName: "   " },
        { bio: " \n " },
      ]) {
        await expect(
          tx.transaction((sp) =>
            asUser(sp, owner, (utx) =>
              utx.update(profiles).set(values).where(eq(profiles.id, owner)),
            ),
          ),
        ).rejects.toEqual(pgError(CHECK_VIOLATION));
      }
    }));

  it("o cadastro corta nome do Google longo e ignora nome vazio", () =>
    inRollback(async (tx) => {
      const longName = await createUser(tx, { full_name: "x".repeat(80) });
      const blankName = await createUser(tx, { full_name: "   " });
      const rows = await tx
        .select({ id: profiles.id, displayName: profiles.displayName })
        .from(profiles)
        .where(sql`${profiles.id} in (${longName}, ${blankName})`);
      const byId = new Map(rows.map((r) => [r.id, r.displayName]));
      expect(byId.get(longName)).toBe("x".repeat(50));
      expect(byId.get(blankName)).toBeNull();
    }));
});
