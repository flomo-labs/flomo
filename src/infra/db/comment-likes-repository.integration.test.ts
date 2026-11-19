import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "./client";
import { createCommentRepository } from "./comment-repository";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { comments, profiles, titles } from "./schema";

// Repositório de comentários com curtidas (#396), sobre a migration 0036: o
// SQL da regra já é coberto em comment-likes.integration.test.ts.
afterAll(closeTestDb);

async function person(tx: Tx) {
  const id = await createUser(tx, { full_name: "Pessoa de Teste" });
  await tx
    .update(profiles)
    .set({ handle: `t${id.replaceAll("-", "").slice(0, 12)}` })
    .where(eq(profiles.id, id));
  return id;
}

async function scene(tx: Tx) {
  const author = await person(tx);
  const [title] = await tx
    .insert(titles)
    .values({ mediaType: "movie", originalTitle: "Filme" })
    .returning({ id: titles.id });
  const [row] = await tx
    .insert(comments)
    .values({ userId: author, titleId: title.id, body: "oi" })
    .returning({ id: comments.id });
  return { author, titleId: title.id, commentId: row.id };
}

describe("repositório de comentários: curtidas", () => {
  it("like e unlike devolvem a contagem; comentário inexistente vira 'não pode'", () =>
    inRollback(async (tx) => {
      const { commentId } = await scene(tx);
      const viewer = await person(tx);
      const liked = await asUser(tx, viewer, (t) =>
        createCommentRepository(t).like(viewer, commentId),
      );
      expect(liked).toEqual({ likeCount: 1, likedByMe: true });
      const missing = await asUser(tx, viewer, (t) =>
        createCommentRepository(t).like(
          viewer,
          "00000000-0000-4000-8000-000000000000",
        ),
      );
      expect(missing).toBeUndefined();
      const unliked = await asUser(tx, viewer, (t) =>
        createCommentRepository(t).unlike(viewer, commentId),
      );
      expect(unliked).toEqual({ likeCount: 0, likedByMe: false });
      const unlikedMissing = await asUser(tx, viewer, (t) =>
        createCommentRepository(t).unlike(
          viewer,
          "00000000-0000-4000-8000-000000000000",
        ),
      );
      expect(unlikedMissing).toBeUndefined();
    }));

  it("listOthers e listMine trazem likeCount e likedByMe", () =>
    inRollback(async (tx) => {
      const { author, titleId, commentId } = await scene(tx);
      const viewer = await person(tx);
      await asUser(tx, viewer, (t) =>
        createCommentRepository(t).like(viewer, commentId),
      );
      await asUser(tx, author, (t) =>
        createCommentRepository(t).like(author, commentId),
      );
      const others = await asUser(tx, viewer, (t) =>
        createCommentRepository(t).listOthers(viewer, titleId, null, 10, null),
      );
      expect(others).toMatchObject([
        { id: commentId, likeCount: 2, likedByMe: true },
      ]);
      const mine = await asUser(tx, author, (t) =>
        createCommentRepository(t).listMine(author, titleId),
      );
      expect(mine).toMatchObject([
        { id: commentId, likeCount: 2, likedByMe: true },
      ]);
    }));
});
