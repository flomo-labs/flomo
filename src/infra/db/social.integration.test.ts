import { desc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { comments, episodes, ratings, seasons, titles } from "./schema";
import { COMMENT_MAX_LENGTH } from "@/contracts/comment";

// Exercita o SQL das migrations de avaliações (policies, CHECKs, cascata,
// restrict e triggers) no banco de teste.
afterAll(closeTestDb);

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

const INSUFFICIENT_PRIVILEGE = "42501"; // inclui violação de RLS
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

// Uma série com dois episódios na primeira temporada.
async function createSeries(tx: Tx) {
  const [series] = await tx
    .insert(titles)
    .values({ mediaType: "tv", originalTitle: "Série de teste" })
    .returning({ id: titles.id });
  const [season] = await tx
    .insert(seasons)
    .values({ titleId: series.id, seasonNumber: 1 })
    .returning({ id: seasons.id });
  const [first, second] = await tx
    .insert(episodes)
    .values([
      { seasonId: season.id, episodeNumber: 1 },
      { seasonId: season.id, episodeNumber: 2 },
    ])
    .returning({ id: episodes.id });
  return { seriesId: series.id, first: first.id, second: second.id };
}

async function createTitle(tx: Tx) {
  const [title] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme de teste" })
    .returning({ id: titles.id });
  return title.id;
}

describe("notas (ratings) no banco", () => {
  it("o dono dá 3,5★ ao filme, troca a nota e a apaga; só há uma nota por filme", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);

      await asUser(tx, owner, (utx) =>
        utx.insert(ratings).values({ userId: owner, titleId, halfStars: 7 }),
      );
      await expect(
        asUser(tx, owner, (utx) =>
          utx.insert(ratings).values({ userId: owner, titleId, halfStars: 8 }),
        ),
      ).rejects.toEqual(pgError(UNIQUE_VIOLATION));

      await asUser(tx, owner, (utx) =>
        utx.update(ratings).set({ halfStars: 9 }).where(eq(ratings.titleId, titleId)),
      );
      const [row] = await asUser(tx, owner, (utx) => utx.select().from(ratings));
      expect(row.halfStars).toBe(9);

      await asUser(tx, owner, (utx) =>
        utx.delete(ratings).where(eq(ratings.titleId, titleId)),
      );
      expect(
        await asUser(tx, owner, (utx) => utx.select().from(ratings)),
      ).toEqual([]);
    }));

  it("recusa nota fora de 1 a 10", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      for (const halfStars of [0, 11]) {
        await expect(
          tx.transaction((sp) =>
            sp.insert(ratings).values({ userId: owner, titleId, halfStars }),
          ),
        ).rejects.toEqual(pgError(CHECK_VIOLATION));
      }
    }));

  it("ninguém lê, altera ou grava a nota de outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const titleId = await createTitle(tx);
      await tx.insert(ratings).values({ userId: owner, titleId, halfStars: 7 });

      expect(
        await asUser(tx, other, (utx) => utx.select().from(ratings)),
      ).toEqual([]);
      const changed = await asUser(tx, other, (utx) =>
        utx
          .update(ratings)
          .set({ halfStars: 1 })
          .where(eq(ratings.userId, owner))
          .returning(),
      );
      expect(changed).toEqual([]);
      await expect(
        asUser(tx, other, (utx) =>
          utx.insert(ratings).values({ userId: owner, titleId, halfStars: 2 }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("updated_at muda a cada alteração", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      const old = new Date("2020-01-01T00:00:00Z");
      await tx
        .insert(ratings)
        .values({ userId: owner, titleId, halfStars: 7, updatedAt: old });
      await tx
        .update(ratings)
        .set({ halfStars: 8 })
        .where(eq(ratings.userId, owner));
      const [row] = await tx.select().from(ratings).where(eq(ratings.userId, owner));
      expect(row.updatedAt.getTime()).toBeGreaterThan(old.getTime());
    }));
});

describe("notas de episódio no banco", () => {
  it("uma nota por episódio; episódios diferentes e o filme não conflitam", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const { seriesId, first, second } = await createSeries(tx);

      await asUser(tx, owner, async (utx) => {
        await utx.insert(ratings).values([
          { userId: owner, titleId: seriesId, episodeId: first, halfStars: 7 },
          { userId: owner, titleId: seriesId, episodeId: second, halfStars: 9 },
        ]);
      });
      await expect(
        asUser(tx, owner, (utx) =>
          utx.insert(ratings).values({
            userId: owner,
            titleId: seriesId,
            episodeId: first,
            halfStars: 2,
          }),
        ),
      ).rejects.toEqual(pgError(UNIQUE_VIOLATION));

      const rows = await asUser(tx, owner, (utx) => utx.select().from(ratings));
      expect(rows.map((r) => r.halfStars).sort()).toEqual([7, 9]);
    }));

  it("o title_id da nota é o do episódio, qualquer que seja o enviado", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const { seriesId, first } = await createSeries(tx);
      const otherTitle = await createTitle(tx);

      const [row] = await tx
        .insert(ratings)
        .values({
          userId: owner,
          titleId: otherTitle,
          episodeId: first,
          halfStars: 7,
        })
        .returning();
      expect(row.titleId).toBe(seriesId);
    }));

  it("nota de filme guarda o title_id enviado e episode_id nulo", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      const [row] = await tx
        .insert(ratings)
        .values({ userId: owner, titleId, halfStars: 7 })
        .returning();
      expect(row.titleId).toBe(titleId);
      expect(row.episodeId).toBeNull();
    }));

  it("ninguém grava nem lê a nota de episódio de outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const { seriesId, first } = await createSeries(tx);
      await tx.insert(ratings).values({
        userId: owner,
        titleId: seriesId,
        episodeId: first,
        halfStars: 7,
      });

      expect(
        await asUser(tx, other, (utx) => utx.select().from(ratings)),
      ).toEqual([]);
      await expect(
        asUser(tx, other, (utx) =>
          utx.insert(ratings).values({
            userId: owner,
            titleId: seriesId,
            episodeId: first,
            halfStars: 1,
          }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("a média soma as notas de todos os usuários, por temporada, sem expor notas", () =>
    inRollback(async (tx) => {
      const [a, b, viewer] = [
        await createUser(tx),
        await createUser(tx),
        await createUser(tx),
      ];
      const { seriesId, first, second } = await createSeries(tx);
      await tx.insert(ratings).values([
        { userId: a, titleId: seriesId, episodeId: first, halfStars: 7 },
        { userId: a, titleId: seriesId, episodeId: second, halfStars: 9 },
        { userId: b, titleId: seriesId, episodeId: first, halfStars: 8 },
      ]);

      // Quem não avaliou nada enxerga a média, mas nenhuma nota.
      const summary = await asUser(tx, viewer, async (utx) => {
        expect(await utx.select().from(ratings)).toEqual([]);
        return utx.execute<{
          season_number: number | null;
          average: string;
          ratings_count: number;
        }>(sql`select * from app.title_rating_summary(${seriesId})`);
      });
      expect(
        summary.map((r) => [r.season_number, Number(r.average), r.ratings_count]),
      ).toEqual([[1, 8, 3]]);
    }));

  it("não deixa apagar episódio com nota de alguém", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const { seriesId, first } = await createSeries(tx);
      await tx.insert(ratings).values({
        userId: owner,
        titleId: seriesId,
        episodeId: first,
        halfStars: 7,
      });
      await expect(
        tx.transaction((sp) => sp.delete(episodes).where(eq(episodes.id, first))),
      ).rejects.toEqual(pgError(FOREIGN_KEY_VIOLATION));
    }));
});

describe("comentários (comments) no banco", () => {
  it("o dono escreve 2 comentários do mesmo título, edita e apaga", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);

      await asUser(tx, owner, async (utx) => {
        await utx
          .insert(comments)
          .values({ userId: owner, titleId, body: "Primeira impressão." });
        await utx.insert(comments).values({
          userId: owner,
          titleId,
          body: "Revi e mudei de ideia.",
          containsSpoilers: true,
        });
      });

      const mine = await asUser(tx, owner, (utx) =>
        utx
          .select()
          .from(comments)
          .where(eq(comments.titleId, titleId))
          .orderBy(desc(comments.createdAt), desc(comments.id)),
      );
      expect(mine).toHaveLength(2);
      expect(mine.every((r) => r.moderationStatus === "published")).toBe(true);

      const first = mine.find((r) => r.body === "Primeira impressão.")!;
      await asUser(tx, owner, (utx) =>
        utx
          .update(comments)
          .set({ body: "Primeira impressão, editada.", containsSpoilers: true })
          .where(eq(comments.id, first.id)),
      );
      await asUser(tx, owner, (utx) =>
        utx.delete(comments).where(eq(comments.id, first.id)),
      );
      const left = await asUser(tx, owner, (utx) => utx.select().from(comments));
      expect(left.map((r) => r.body)).toEqual(["Revi e mudei de ideia."]);
    }));

  it("recusa texto vazio, só com espaços ou acima do limite", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      const bodies = ["", "   ", "\n\t \n", "a".repeat(COMMENT_MAX_LENGTH + 1)];
      for (const body of bodies) {
        await expect(
          tx.transaction((sp) =>
            sp.insert(comments).values({ userId: owner, titleId, body }),
          ),
        ).rejects.toEqual(pgError(CHECK_VIOLATION));
      }
      await tx.insert(comments).values({
        userId: owner,
        titleId,
        body: "a".repeat(COMMENT_MAX_LENGTH),
      });
    }));

  it("o autor não escolhe nem troca a situação de moderação", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);

      const [created] = await asUser(tx, owner, (utx) =>
        utx
          .insert(comments)
          .values({
            userId: owner,
            titleId,
            body: "Texto.",
            moderationStatus: "hidden",
          })
          .returning(),
      );
      expect(created.moderationStatus).toBe("published");

      // O servidor (moderação) oculta; o autor não publica de novo.
      await tx
        .update(comments)
        .set({ moderationStatus: "hidden" })
        .where(eq(comments.id, created.id));
      await expect(
        asUser(tx, owner, (utx) =>
          utx
            .update(comments)
            .set({ moderationStatus: "published" })
            .where(eq(comments.id, created.id)),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));

      // Editar o texto não mexe na situação.
      await asUser(tx, owner, (utx) =>
        utx
          .update(comments)
          .set({ body: "Texto editado." })
          .where(eq(comments.id, created.id)),
      );
      const [row] = await tx.select().from(comments).where(eq(comments.id, created.id));
      expect(row.moderationStatus).toBe("hidden");

      // Nem junto com uma edição do texto.
      await expect(
        asUser(tx, owner, (utx) =>
          utx
            .update(comments)
            .set({ body: "De novo.", moderationStatus: "published" })
            .where(eq(comments.id, created.id)),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("ocultar pela moderação não conta como edição do autor", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      const old = new Date("2020-01-01T00:00:00Z");
      const [created] = await tx
        .insert(comments)
        .values({ userId: owner, titleId, body: "Texto.", updatedAt: old })
        .returning();
      await tx
        .update(comments)
        .set({ moderationStatus: "hidden" })
        .where(eq(comments.id, created.id));
      const [row] = await tx.select().from(comments).where(eq(comments.id, created.id));
      expect(row.updatedAt).toEqual(old);
    }));

  it("ninguém lê, altera ou grava comentário de outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const titleId = await createTitle(tx);
      await tx.insert(comments).values({ userId: owner, titleId, body: "Minha." });

      expect(
        await asUser(tx, other, (utx) => utx.select().from(comments)),
      ).toEqual([]);
      const changed = await asUser(tx, other, (utx) =>
        utx
          .update(comments)
          .set({ body: "Alterada." })
          .where(eq(comments.userId, owner))
          .returning(),
      );
      expect(changed).toEqual([]);
      const removed = await asUser(tx, other, (utx) =>
        utx.delete(comments).where(eq(comments.userId, owner)).returning(),
      );
      expect(removed).toEqual([]);
      await expect(
        asUser(tx, other, (utx) =>
          utx.insert(comments).values({ userId: owner, titleId, body: "Falsa." }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("updated_at muda a cada alteração", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      const old = new Date("2020-01-01T00:00:00Z");
      const [created] = await tx
        .insert(comments)
        .values({ userId: owner, titleId, body: "Texto.", updatedAt: old })
        .returning();
      await tx
        .update(comments)
        .set({ body: "Outro texto." })
        .where(eq(comments.id, created.id));
      const [row] = await tx.select().from(comments).where(eq(comments.id, created.id));
      expect(row.updatedAt.getTime()).toBeGreaterThan(old.getTime());
    }));
});

describe("avaliações, conta e catálogo", () => {
  it("apagar a conta apaga notas e comentários em cascata", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      await tx.insert(ratings).values({ userId: owner, titleId, halfStars: 7 });
      await tx.insert(comments).values({ userId: owner, titleId, body: "Texto." });

      await tx.execute(sql`delete from auth.users where id = ${owner}`);
      expect(
        await tx.select().from(ratings).where(eq(ratings.userId, owner)),
      ).toEqual([]);
      expect(
        await tx.select().from(comments).where(eq(comments.userId, owner)),
      ).toEqual([]);
    }));

  it("não deixa apagar título com nota ou comentário de alguém", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const rated = await createTitle(tx);
      const commented = await createTitle(tx);
      await tx
        .insert(ratings)
        .values({ userId: owner, titleId: rated, halfStars: 7 });
      await tx
        .insert(comments)
        .values({ userId: owner, titleId: commented, body: "Texto." });

      for (const id of [rated, commented]) {
        await expect(
          tx.transaction((sp) => sp.delete(titles).where(eq(titles.id, id))),
        ).rejects.toEqual(pgError(FOREIGN_KEY_VIOLATION));
      }
    }));
});
