import { desc, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { ratings, reviews, titles } from "./schema";
import { REVIEW_MAX_LENGTH } from "@/contracts/review";

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

async function createTitle(tx: Tx) {
  const [title] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme de teste" })
    .returning({ id: titles.id });
  return title.id;
}

describe("notas (ratings) no banco", () => {
  it("o dono dá 3,5★, troca a nota e a apaga; só há uma nota por título", () =>
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

describe("reviews no banco", () => {
  it("o dono escreve 2 reviews do mesmo título, edita e apaga", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);

      await asUser(tx, owner, async (utx) => {
        await utx
          .insert(reviews)
          .values({ userId: owner, titleId, body: "Primeira impressão." });
        await utx.insert(reviews).values({
          userId: owner,
          titleId,
          body: "Revi e mudei de ideia.",
          containsSpoilers: true,
        });
      });

      const mine = await asUser(tx, owner, (utx) =>
        utx
          .select()
          .from(reviews)
          .where(eq(reviews.titleId, titleId))
          .orderBy(desc(reviews.createdAt), desc(reviews.id)),
      );
      expect(mine).toHaveLength(2);
      expect(mine.every((r) => r.moderationStatus === "published")).toBe(true);

      const first = mine.find((r) => r.body === "Primeira impressão.")!;
      await asUser(tx, owner, (utx) =>
        utx
          .update(reviews)
          .set({ body: "Primeira impressão, editada.", containsSpoilers: true })
          .where(eq(reviews.id, first.id)),
      );
      await asUser(tx, owner, (utx) =>
        utx.delete(reviews).where(eq(reviews.id, first.id)),
      );
      const left = await asUser(tx, owner, (utx) => utx.select().from(reviews));
      expect(left.map((r) => r.body)).toEqual(["Revi e mudei de ideia."]);
    }));

  it("recusa texto vazio, só com espaços ou acima do limite", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      const bodies = ["", "   ", "\n\t \n", "a".repeat(REVIEW_MAX_LENGTH + 1)];
      for (const body of bodies) {
        await expect(
          tx.transaction((sp) =>
            sp.insert(reviews).values({ userId: owner, titleId, body }),
          ),
        ).rejects.toEqual(pgError(CHECK_VIOLATION));
      }
      await tx.insert(reviews).values({
        userId: owner,
        titleId,
        body: "a".repeat(REVIEW_MAX_LENGTH),
      });
    }));

  it("o autor não escolhe nem troca a situação de moderação", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);

      const [created] = await asUser(tx, owner, (utx) =>
        utx
          .insert(reviews)
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
        .update(reviews)
        .set({ moderationStatus: "hidden" })
        .where(eq(reviews.id, created.id));
      await expect(
        asUser(tx, owner, (utx) =>
          utx
            .update(reviews)
            .set({ moderationStatus: "published" })
            .where(eq(reviews.id, created.id)),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));

      // Editar o texto não mexe na situação.
      await asUser(tx, owner, (utx) =>
        utx
          .update(reviews)
          .set({ body: "Texto editado." })
          .where(eq(reviews.id, created.id)),
      );
      const [row] = await tx.select().from(reviews).where(eq(reviews.id, created.id));
      expect(row.moderationStatus).toBe("hidden");
    }));

  it("ninguém lê, altera ou grava review de outro usuário", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const other = await createUser(tx);
      const titleId = await createTitle(tx);
      await tx.insert(reviews).values({ userId: owner, titleId, body: "Minha." });

      expect(
        await asUser(tx, other, (utx) => utx.select().from(reviews)),
      ).toEqual([]);
      const changed = await asUser(tx, other, (utx) =>
        utx
          .update(reviews)
          .set({ body: "Alterada." })
          .where(eq(reviews.userId, owner))
          .returning(),
      );
      expect(changed).toEqual([]);
      const removed = await asUser(tx, other, (utx) =>
        utx.delete(reviews).where(eq(reviews.userId, owner)).returning(),
      );
      expect(removed).toEqual([]);
      await expect(
        asUser(tx, other, (utx) =>
          utx.insert(reviews).values({ userId: owner, titleId, body: "Falsa." }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("updated_at muda a cada alteração", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      const old = new Date("2020-01-01T00:00:00Z");
      const [created] = await tx
        .insert(reviews)
        .values({ userId: owner, titleId, body: "Texto.", updatedAt: old })
        .returning();
      await tx
        .update(reviews)
        .set({ body: "Outro texto." })
        .where(eq(reviews.id, created.id));
      const [row] = await tx.select().from(reviews).where(eq(reviews.id, created.id));
      expect(row.updatedAt.getTime()).toBeGreaterThan(old.getTime());
    }));
});

describe("avaliações, conta e catálogo", () => {
  it("apagar a conta apaga notas e reviews em cascata", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const titleId = await createTitle(tx);
      await tx.insert(ratings).values({ userId: owner, titleId, halfStars: 7 });
      await tx.insert(reviews).values({ userId: owner, titleId, body: "Texto." });

      await tx.execute(sql`delete from auth.users where id = ${owner}`);
      expect(
        await tx.select().from(ratings).where(eq(ratings.userId, owner)),
      ).toEqual([]);
      expect(
        await tx.select().from(reviews).where(eq(reviews.userId, owner)),
      ).toEqual([]);
    }));

  it("não deixa apagar título com nota ou review de alguém", () =>
    inRollback(async (tx) => {
      const owner = await createUser(tx);
      const rated = await createTitle(tx);
      const reviewed = await createTitle(tx);
      await tx
        .insert(ratings)
        .values({ userId: owner, titleId: rated, halfStars: 7 });
      await tx
        .insert(reviews)
        .values({ userId: owner, titleId: reviewed, body: "Texto." });

      for (const id of [rated, reviewed]) {
        await expect(
          tx.transaction((sp) => sp.delete(titles).where(eq(titles.id, id))),
        ).rejects.toEqual(pgError(FOREIGN_KEY_VIOLATION));
      }
    }));
});
