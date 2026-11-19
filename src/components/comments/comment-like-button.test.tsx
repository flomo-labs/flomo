// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CommentLikeButton,
  type CommentLikeLabels,
} from "./comment-like-button";

const { addCommentLike, removeCommentLike } = vi.hoisted(() => ({
  addCommentLike: vi.fn(),
  removeCommentLike: vi.fn(),
}));
vi.mock("@/app/_comments/actions", () => ({
  addCommentLike,
  removeCommentLike,
}));

const labels: CommentLikeLabels = {
  like: "Curtir comentário",
  unlike: "Remover curtida",
  failed: "Não foi possível curtir este comentário.",
};

beforeEach(() => {
  addCommentLike.mockReset();
  removeCommentLike.mockReset();
});
afterEach(cleanup);

function setup(likeCount: number, likedByMe: boolean) {
  render(
    <CommentLikeButton
      commentId="c1"
      initial={{ likeCount, likedByMe }}
      labels={labels}
    />,
  );
}

describe("CommentLikeButton", () => {
  it("não mostra número com zero curtidas", () => {
    setup(0, false);
    const button = screen.getByRole("button", { name: "Curtir comentário" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.textContent).toBe("");
  });

  it("curte na hora e acerta com a contagem do servidor", async () => {
    let resolve!: (v: unknown) => void;
    addCommentLike.mockReturnValue(new Promise((r) => (resolve = r)));
    setup(2, false);
    await userEvent.click(
      screen.getByRole("button", { name: "Curtir comentário" }),
    );
    expect(
      screen.getByRole("button", { name: "Remover curtida" }).textContent,
    ).toBe("3");
    resolve({ ok: true, value: { likeCount: 4, likedByMe: true } });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remover curtida" }).textContent,
      ).toBe("4"),
    );
    expect(addCommentLike).toHaveBeenCalledWith({ commentId: "c1" });
  });

  it("descurte", async () => {
    removeCommentLike.mockResolvedValue({
      ok: true,
      value: { likeCount: 1, likedByMe: false },
    });
    setup(2, true);
    await userEvent.click(
      screen.getByRole("button", { name: "Remover curtida" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Curtir comentário" }).textContent,
      ).toBe("1"),
    );
    expect(removeCommentLike).toHaveBeenCalledWith({ commentId: "c1" });
  });

  it("volta ao estado anterior e avisa quando o servidor recusa", async () => {
    addCommentLike.mockResolvedValue({
      ok: false,
      error: {
        code: "COMMENT_NOT_FOUND",
        message: "Comentário não encontrado.",
      },
    });
    setup(2, false);
    await userEvent.click(
      screen.getByRole("button", { name: "Curtir comentário" }),
    );
    expect((await screen.findByRole("alert")).textContent).toBe(labels.failed);
    expect(
      screen.getByRole("button", { name: "Curtir comentário" }).textContent,
    ).toBe("2");
  });

  it("volta ao estado anterior quando o pedido falha", async () => {
    addCommentLike.mockRejectedValue(new Error("rede"));
    setup(0, false);
    await userEvent.click(
      screen.getByRole("button", { name: "Curtir comentário" }),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Curtir comentário" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});
