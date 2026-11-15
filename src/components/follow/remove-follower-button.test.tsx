// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RemoveFollowerButton,
  type RemoveFollowerButtonLabels,
} from "./remove-follower-button";

const { removeFollowerAction, toastError, toastSuccess, push, refresh } =
  vi.hoisted(() => ({
    removeFollowerAction: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  }));

vi.mock("@/app/_follow/actions", () => ({ removeFollowerAction }));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const labels: RemoveFollowerButtonLabels = {
  remove: "Remover",
  confirmTitle: "Remover {name} dos seus seguidores?",
  confirmDescription: "{name} deixa de seguir você e não é avisado(a).",
  confirm: "Remover seguidor",
  cancel: "Cancelar",
  removeAria: "Remover {name} dos seus seguidores",
  removed: "{name} não segue mais você.",
  failed: "Não foi possível concluir agora.",
};

async function openDialog() {
  render(<RemoveFollowerButton followerId="f1" name="Ana" labels={labels} />);
  await userEvent.click(
    screen.getByRole("button", { name: "Remover Ana dos seus seguidores" }),
  );
}

describe("RemoveFollowerButton", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("pede confirmação e não remove ao cancelar", async () => {
    await openDialog();
    expect(
      screen.getByText("Remover Ana dos seus seguidores?"),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(removeFollowerAction).not.toHaveBeenCalled();
  });

  it("remove ao confirmar, avisa e atualiza a tela", async () => {
    removeFollowerAction.mockResolvedValue({
      ok: true,
      value: { removed: true },
    });
    await openDialog();
    await userEvent.click(
      screen.getByRole("button", { name: "Remover seguidor" }),
    );
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Ana não segue mais você."),
    );
    expect(removeFollowerAction).toHaveBeenCalledWith({ followerId: "f1" });
    expect(refresh).toHaveBeenCalled();
  });

  it("mostra o erro do servidor e mantém o diálogo aberto", async () => {
    removeFollowerAction.mockResolvedValue({
      ok: false,
      error: { code: "INVALID_INPUT", message: "Pessoa inválida." },
    });
    await openDialog();
    await userEvent.click(
      screen.getByRole("button", { name: "Remover seguidor" }),
    );
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Pessoa inválida."),
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("manda para a entrada quando a sessão expirou", async () => {
    removeFollowerAction.mockResolvedValue({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "x" },
    });
    await openDialog();
    await userEvent.click(
      screen.getByRole("button", { name: "Remover seguidor" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/entrar"));
  });
});
