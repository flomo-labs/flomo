// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonActionsMenu } from "./person-actions-menu";
import type { RemoveFollowerLabels } from "./remove-follower-dialog";
import type { FollowToggleLabels } from "./use-follow-toggle";

const {
  follow,
  unfollow,
  removeFollowerAction,
  toastError,
  toastSuccess,
  push,
} = vi.hoisted(() => ({
  follow: vi.fn(),
  unfollow: vi.fn(),
  removeFollowerAction: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/app/_follow/actions", () => ({
  follow,
  unfollow,
  removeFollowerAction,
}));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const labels: FollowToggleLabels = {
  follow: "Seguir",
  followBack: "Seguir de volta",
  following: "Seguindo",
  requested: "Solicitado",
  followAria: "Seguir {name}",
  followBackAria: "Seguir {name} de volta",
  unfollowAria: "Deixar de seguir {name}",
  cancelAria: "Cancelar solicitação para {name}",
  nowFollowing: "Agora você segue {name}.",
  nowRequested: "Solicitação enviada para {name}.",
  unfollowed: "Você deixou de seguir {name}.",
  cancelled: "Solicitação para {name} cancelada.",
  failed: "Não foi possível concluir agora.",
  rateLimited: "Muitos pedidos para seguir. Tente mais tarde.",
};

const removeLabels: RemoveFollowerLabels = {
  menuItem: "Remover seguidor",
  confirmTitle: "Remover {name} dos seus seguidores?",
  confirmDescription: "{name} deixa de seguir você e não é avisado(a).",
  confirm: "Remover",
  cancel: "Cancelar",
  removed: "{name} não segue mais você.",
  failed: "Não foi possível concluir agora.",
};

const onRemoved = vi.fn();

async function openMenu(withRemove: boolean) {
  render(
    <PersonActionsMenu
      profileId="p1"
      name="Ana"
      status="accepted"
      labels={labels}
      menuLabel="Mais opções para {name}"
      removeLabels={withRemove ? removeLabels : null}
      onRemoved={onRemoved}
    />,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Mais opções para Ana" }),
  );
}

describe("PersonActionsMenu", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("deixa de seguir pelo item do menu", async () => {
    unfollow.mockResolvedValue({ ok: true, value: {} });
    await openMenu(false);
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Deixar de seguir Ana" }),
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Você deixou de seguir Ana."),
    );
    expect(unfollow).toHaveBeenCalledWith({ profileId: "p1" });
  });

  it("não oferece Remover seguidor sem as etiquetas", async () => {
    await openMenu(false);
    await screen.findByRole("menuitem", { name: "Deixar de seguir Ana" });
    expect(screen.queryByRole("menuitem", { name: "Remover seguidor" })).toBeNull();
  });

  it("pede confirmação e não remove ao cancelar", async () => {
    await openMenu(true);
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remover seguidor" }),
    );
    expect(
      await screen.findByText("Remover Ana dos seus seguidores?"),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(removeFollowerAction).not.toHaveBeenCalled();
  });

  it("remove ao confirmar, avisa e tira a pessoa da lista", async () => {
    removeFollowerAction.mockResolvedValue({
      ok: true,
      value: { removed: true },
    });
    await openMenu(true);
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remover seguidor" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Ana não segue mais você."),
    );
    expect(removeFollowerAction).toHaveBeenCalledWith({ followerId: "p1" });
    expect(onRemoved).toHaveBeenCalled();
  });

  it("mostra o erro do servidor e não tira a pessoa da lista", async () => {
    removeFollowerAction.mockResolvedValue({
      ok: false,
      error: { code: "INVALID_INPUT", message: "Pessoa inválida." },
    });
    await openMenu(true);
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Remover seguidor" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Pessoa inválida."),
    );
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
