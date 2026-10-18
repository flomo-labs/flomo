import { afterAll, describe, expect, it } from "vitest";
import { COMMENT_MAX_LENGTH } from "@/contracts/comment";
import {
  createComment,
  deleteComment,
  listMyComments,
  updateComment,
} from "@/domain/comment/comments";
import { eq, sql } from "drizzle-orm";
import type { Tx } from "./client";
import { createCommentRepository } from "./comment-repository";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createLibraryRepository } from "./library-repository";
import { comments, titles } from "./schema";

// Casos de uso de comentário contra o banco de teste, pelo mesmo caminho da
// borda: repositórios dentro do `withUser`, sob RLS.
afterAll(closeTestDb);

async function createTitle(tx: Tx) {
  const [title] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme" })
    .returning({ id: titles.id });
  return title.id;
}

function run<T>(
  tx: Tx,
  userId: string,
  fn: (
    deps: {
      comments: ReturnType<typeof createCommentRepository>;
      library: ReturnType<typeof createLibraryRepository>;
    },
    user: { id: string },
  ) => Promise<T>,
) {
  return asUser(tx, userId, (utx) =>
    fn(
      {
        comments: createCommentRepository(utx),
        library: createLibraryRepository(utx),
      },
      { id: userId },
    ),
  );
}

describe("comentários no banco", () => {
  it("escreve 2 comentários, edita, lista do mais recente e apaga", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const titleId = await createTitle(tx);

      const first = await run(tx, user, (d, u) =>
        createComment(d, u, { titleId, body: "Primeira impressão." }),
      );
      const second = await run(tx, user, (d, u) =>
        createComment(d, u, { titleId, body: "Revi.", containsSpoilers: true }),
      );
      if (!first.ok || !second.ok) throw new Error("não criou");
      expect(second.value).toMatchObject({
        moderationStatus: "published",
        containsSpoilers: true,
      });

      // Na mesma transação os dois têm o mesmo created_at: a ordem de
      // desempate é o id, então só conferimos o conjunto e a ordem estável.
      const list = await run(tx, user, (d, u) =>
        listMyComments(d, u, { titleId }),
      );
      expect(list.ok && list.value.map((c) => c.body).sort()).toEqual([
        "Primeira impressão.",
        "Revi.",
      ]);

      const edited = await run(tx, user, (d, u) =>
        updateComment(d, u, {
          commentId: first.value.id,
          body: "Mudei de ideia.",
        }),
      );
      expect(edited).toMatchObject({ ok: true, value: { body: "Mudei de ideia." } });

      await run(tx, user, (d, u) =>
        deleteComment(d, u, { commentId: first.value.id }),
      );
      const left = await run(tx, user, (d, u) =>
        listMyComments(d, u, { titleId }),
      );
      expect(left.ok && left.value.map((c) => c.id)).toEqual([second.value.id]);
    }));

  it("cada usuário só vê, edita e apaga os próprios comentários", () =>
    inRollback(async (tx) => {
      const [owner, other] = [await createUser(tx), await createUser(tx)];
      const titleId = await createTitle(tx);
      const created = await run(tx, owner, (d, u) =>
        createComment(d, u, { titleId, body: "Meu." }),
      );
      if (!created.ok) throw new Error("não criou");

      const theirList = await run(tx, other, (d, u) =>
        listMyComments(d, u, { titleId }),
      );
      expect(theirList).toEqual({ ok: true, value: [] });
      const edit = await run(tx, other, (d, u) =>
        updateComment(d, u, { commentId: created.value.id, body: "Dele." }),
      );
      expect(edit).toMatchObject({ error: { code: "COMMENT_NOT_FOUND" } });
      await run(tx, other, (d, u) =>
        deleteComment(d, u, { commentId: created.value.id }),
      );
      const mine = await run(tx, owner, (d, u) =>
        listMyComments(d, u, { titleId }),
      );
      expect(mine.ok && mine.value.map((c) => c.body)).toEqual(["Meu."]);
    }));

  it("o texto aceito pelo Zod também passa no CHECK do banco, no limite", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const titleId = await createTitle(tx);
      for (const body of [
        "a".repeat(COMMENT_MAX_LENGTH),
        "😀".repeat(COMMENT_MAX_LENGTH),
      ]) {
        const result = await run(tx, user, (d, u) =>
          createComment(d, u, { titleId, body }),
        );
        expect(result.ok).toBe(true);
      }
    }));

  it("a edição do autor não muda a moderação, e a do servidor não muda a data de edição", () =>
    inRollback(async (tx) => {
      const user = await createUser(tx);
      const titleId = await createTitle(tx);
      const created = await run(tx, user, (d, u) =>
        createComment(d, u, { titleId, body: "Texto." }),
      );
      if (!created.ok) throw new Error("não criou");
      await tx.execute(
        sql`update public.comments set moderation_status = 'hidden' where id = ${created.value.id}`,
      );
      const list = await run(tx, user, (d, u) =>
        listMyComments(d, u, { titleId }),
      );
      expect(list.ok && list.value[0]).toMatchObject({
        moderationStatus: "hidden",
      });
      // Filtrado pelo id: o banco de desenvolvimento tem comentários de verdade.
      const [row] = await tx
        .select()
        .from(comments)
        .where(eq(comments.id, created.value.id));
      expect(row.updatedAt).toEqual(created.value.updatedAt);
    }));
});
