// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentPage } from "@/domain/comment/comments";
import type { PublicComment } from "@/domain/comment/ports";
import { CommentList, type CommentListLabels } from "./comment-list";

const { loadTitleComments } = vi.hoisted(() => ({
  loadTitleComments: vi.fn(),
}));
vi.mock("@/app/_comments/actions", () => ({ loadTitleComments }));

const labels: CommentListLabels = {
  card: {
    anonymousAuthor: "Pessoa do Flomo",
    spoilers: "Spoiler",
    spoilerHidden: "Este comentário tem spoiler.",
    showSpoiler: "Mostrar spoiler",
    hideSpoiler: "Esconder spoiler",
    edited: "editado",
  },
  empty: "Ninguém comentou ainda.",
  loadMore: "Carregar mais",
  loadFailed: "Não foi possível carregar.",
  retry: "Tentar de novo",
};

const TITLE = "11111111-1111-4111-8111-111111111111";
const CURSOR = {
  at: "2026-11-17T12:00:00.000000Z",
  id: "22222222-2222-4222-8222-222222222222",
};

function comment(id: string, body: string): PublicComment {
  return {
    id,
    titleId: TITLE,
    seasonId: null,
    episodeId: null,
    body,
    containsSpoilers: false,
    createdAt: new Date("2026-11-17T12:00:00Z"),
    updatedAt: new Date("2026-11-17T12:00:00Z"),
    author: { id: "a", handle: "ana", displayName: "Ana", avatarUrl: null },
    cursorAt: "2026-11-17T12:00:00.000000Z",
  };
}

const page = (items: PublicComment[], next: CommentPage["next"]) => ({
  items,
  next,
});

beforeEach(() => loadTitleComments.mockReset());
afterEach(cleanup);

describe("CommentList", () => {
  it("mostra a primeira página recebida e carrega mais pelo cursor", async () => {
    const user = userEvent.setup();
    loadTitleComments.mockResolvedValue({
      ok: true,
      value: page([comment("c2", "Segundo")], null),
    });
    render(
      <CommentList
        scope={{ titleId: TITLE }}
        initial={page([comment("c1", "Primeiro")], CURSOR)}
        labels={labels}
      />,
    );
    expect(screen.getByText("Primeiro")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    await waitFor(() => expect(screen.getByText("Segundo")).toBeTruthy());
    expect(loadTitleComments).toHaveBeenCalledWith(
      expect.objectContaining({ titleId: TITLE, after: CURSOR }),
    );
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
  });

  it("sem página inicial, pede a primeira ao montar (temporada e episódio)", async () => {
    loadTitleComments.mockResolvedValue({
      ok: true,
      value: page([comment("c1", "Do episódio")], null),
    });
    render(
      <CommentList
        scope={{ titleId: TITLE, episodeId: "ep" }}
        labels={labels}
      />,
    );
    await waitFor(() => expect(screen.getByText("Do episódio")).toBeTruthy());
    expect(loadTitleComments).toHaveBeenCalledWith(
      expect.objectContaining({ titleId: TITLE, episodeId: "ep", after: null }),
    );
  });

  it("mostra o estado vazio", () => {
    render(
      <CommentList
        scope={{ titleId: TITLE }}
        initial={page([], null)}
        labels={labels}
      />,
    );
    expect(screen.getByText("Ninguém comentou ainda.")).toBeTruthy();
  });

  it("mostra o erro e tenta de novo sem repetir comentários", async () => {
    const user = userEvent.setup();
    loadTitleComments
      .mockResolvedValueOnce({
        ok: false,
        error: { code: "TITLE_NOT_FOUND", message: "x" },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: page([comment("c1", "Primeiro")], null),
      });
    render(
      <CommentList
        scope={{ titleId: TITLE, seasonId: "s" }}
        labels={labels}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível carregar.",
    );
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(screen.getByText("Primeiro")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("não repete comentário que já está na lista", async () => {
    const user = userEvent.setup();
    loadTitleComments.mockResolvedValue({
      ok: true,
      value: page([comment("c1", "Primeiro"), comment("c2", "Segundo")], null),
    });
    render(
      <CommentList
        scope={{ titleId: TITLE }}
        initial={page([comment("c1", "Primeiro")], CURSOR)}
        labels={labels}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Carregar mais" }));
    await waitFor(() => expect(screen.getByText("Segundo")).toBeTruthy());
    expect(screen.getAllByText("Primeiro")).toHaveLength(1);
  });
});
