import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, likeComment, unlikeComment, listTitleComments } =
  vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    likeComment: vi.fn(),
    unlikeComment: vi.fn(),
    listTitleComments: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/infra/db/client", () => ({
  withUser: vi.fn((_claims: unknown, fn: (tx: unknown) => unknown) => fn({})),
}));
vi.mock("@/infra/db/comment-repository", () => ({
  createCommentRepository: vi.fn(),
}));
vi.mock("@/infra/db/library-repository", () => ({
  createLibraryRepository: vi.fn(),
}));
vi.mock("../_auth/session", () => ({ getCurrentUser }));
vi.mock("@/domain/comment/comments", () => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  updateComment: vi.fn(),
  likeComment,
  unlikeComment,
  listTitleComments,
}));

import {
  addCommentLike,
  loadTitleComments,
  removeCommentLike,
} from "./actions";

const likes = { likeCount: 1, likedByMe: true };

describe("curtidas de comentário: limite de pedidos", () => {
  beforeEach(() => {
    likeComment.mockReset().mockResolvedValue({ ok: true, value: likes });
    unlikeComment.mockReset().mockResolvedValue({ ok: true, value: likes });
    listTitleComments.mockReset().mockResolvedValue({ ok: true, value: {} });
  });

  it("recusa com RATE_LIMITED depois do limite, curtir e descurtir dividem o contador", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-a", claims: {} });
    const results = [];
    for (let i = 0; i < 30; i++) {
      results.push(
        await (i % 2 ? removeCommentLike : addCommentLike)({ commentId: "c" }),
      );
    }
    expect(results.every((r) => r.ok)).toBe(true);
    const over = await addCommentLike({ commentId: "c" });
    expect(!over.ok && over.error.code).toBe("RATE_LIMITED");
    const overUnlike = await removeCommentLike({ commentId: "c" });
    expect(!overUnlike.ok && overUnlike.error.code).toBe("RATE_LIMITED");
    expect(
      likeComment.mock.calls.length + unlikeComment.mock.calls.length,
    ).toBe(30);
  });

  it("conta por usuário: outro usuário não é afetado", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-b", claims: {} });
    expect((await addCommentLike({ commentId: "c" })).ok).toBe(true);
  });

  it("sem login devolve UNAUTHENTICATED sem gastar limite", async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await addCommentLike({ commentId: "c" });
    expect(!result.ok && result.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("loadTitleComments: limite de pedidos", () => {
  it("recusa com RATE_LIMITED depois de 60 pedidos por minuto", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-c", claims: {} });
    listTitleComments.mockResolvedValue({ ok: true, value: {} });
    for (let i = 0; i < 60; i++) {
      expect((await loadTitleComments({})).ok).toBe(true);
    }
    const over = await loadTitleComments({});
    expect(!over.ok && over.error.code).toBe("RATE_LIMITED");
    expect(listTitleComments).toHaveBeenCalledTimes(60);
  });
});
