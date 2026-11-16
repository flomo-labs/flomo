// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InfinitePersonList,
  type FollowListItem,
  type InfinitePersonListLabels,
} from "./infinite-person-list";

const { loadMorePeople, removeFollowerAction } = vi.hoisted(() => ({
  loadMorePeople: vi.fn(),
  removeFollowerAction: vi.fn(),
}));

vi.mock("@/app/_follow/actions", () => ({
  loadMorePeople,
  removeFollowerAction,
  follow: vi.fn(),
  unfollow: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// jsdom não tem IntersectionObserver: o teste dispara a interseção à mão.
let trigger: () => void = () => {};
class FakeObserver {
  constructor(cb: IntersectionObserverCallback) {
    trigger = () =>
      cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  observe() {}
  disconnect() {}
}

const follow = {
  follow: "Seguir",
  followBack: "Seguir de volta",
  following: "Seguindo",
  requested: "Solicitado",
  followAria: "Seguir {name}",
  followBackAria: "Seguir {name} de volta",
  unfollowAria: "Deixar de seguir {name}",
  cancelAria: "Cancelar solicitação para {name}",
  nowFollowing: "ok",
  nowRequested: "ok",
  unfollowed: "ok",
  cancelled: "ok",
  failed: "falhou",
  rateLimited: "limite",
  blocked: "bloqueada",
};

const labels: InfinitePersonListLabels = {
  followsYou: "Segue você",
  menu: "Mais opções para {name}",
  empty: "Ainda não há seguidores por aqui.",
  loadFailed: "Não foi possível carregar mais pessoas.",
  retry: "Tentar de novo",
  follow,
  remove: {
    menuItem: "Remover seguidor",
    confirmTitle: "Remover {name}?",
    confirmDescription: "{name} deixa de seguir você.",
    confirm: "Remover",
    cancel: "Cancelar",
    removed: "{name} removido.",
    failed: "falhou",
  },
};

function person(n: number): FollowListItem {
  return {
    profileId: `00000000-0000-4000-8000-00000000000${n}`,
    handle: `p${n}`,
    displayName: `Pessoa ${n}`,
    following: null,
    followsYou: false,
    isSelf: false,
  };
}

// Cursor do último item do trecho inicial (a pessoa 2) e o do trecho seguinte.
const CURSOR_2 = { at: "2026-01-02T00:00:00.123456Z", id: person(2).profileId };
const CURSOR_3 = { at: "2026-01-01T00:00:00.000000Z", id: person(3).profileId };

function renderList(hasMore = true) {
  render(
    <InfinitePersonList
      profileId="owner"
      kind="followers"
      initialItems={[person(1), person(2)]}
      initialNextCursor={hasMore ? CURSOR_2 : null}
      labels={labels}
    />,
  );
}

describe("InfinitePersonList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("carrega o próximo trecho ao chegar no fim e para quando acaba", async () => {
    loadMorePeople.mockResolvedValue({
      ok: true,
      value: { items: [person(3)], nextCursor: null },
    });
    renderList();
    act(() => trigger());
    await screen.findByText("Pessoa 3");
    expect(loadMorePeople).toHaveBeenCalledWith({
      profileId: "owner",
      kind: "followers",
      after: CURSOR_2,
    });
  });

  it("pede o trecho seguinte a partir do cursor devolvido, não da quantidade", async () => {
    loadMorePeople.mockResolvedValueOnce({
      ok: true,
      value: { items: [person(3)], nextCursor: CURSOR_3 },
    });
    loadMorePeople.mockResolvedValueOnce({
      ok: true,
      value: { items: [], nextCursor: null },
    });
    renderList();
    act(() => trigger());
    await screen.findByText("Pessoa 3");
    act(() => trigger());
    await waitFor(() =>
      expect(loadMorePeople).toHaveBeenLastCalledWith({
        profileId: "owner",
        kind: "followers",
        after: CURSOR_3,
      }),
    );
  });

  it("quem foi removido não muda o cursor do próximo pedido", async () => {
    removeFollowerAction.mockResolvedValue({ ok: true, value: { removed: true } });
    loadMorePeople.mockResolvedValue({
      ok: true,
      value: { items: [], nextCursor: null },
    });
    renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Mais opções para Pessoa 1" }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remover seguidor" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
    await waitFor(() => expect(screen.queryByText("Pessoa 1")).toBeNull());
    act(() => trigger());
    await waitFor(() =>
      expect(loadMorePeople).toHaveBeenCalledWith({
        profileId: "owner",
        kind: "followers",
        after: CURSOR_2,
      }),
    );
  });

  it("mostra o erro e tenta de novo", async () => {
    loadMorePeople.mockRejectedValueOnce(new Error("rede"));
    loadMorePeople.mockResolvedValueOnce({
      ok: true,
      value: { items: [person(3)], nextCursor: null },
    });
    renderList();
    act(() => trigger());
    await screen.findByText(labels.loadFailed);
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByText("Pessoa 3");
  });

  it("mostra o estado vazio quando não há ninguém", () => {
    render(
      <InfinitePersonList
        profileId="owner"
        kind="followers"
        initialItems={[]}
        initialNextCursor={null}
        labels={labels}
      />,
    );
    expect(screen.getByText(labels.empty)).toBeTruthy();
  });
});
