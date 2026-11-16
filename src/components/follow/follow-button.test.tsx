// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FollowButton, type FollowButtonLabels } from "./follow-button";

const { follow, unfollow, toastError, toastSuccess, push } = vi.hoisted(() => ({
  follow: vi.fn(),
  unfollow: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/app/_follow/actions", () => ({ follow, unfollow }));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const labels: FollowButtonLabels = {
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
  blocked: "Você bloqueou esta pessoa.",
};

function renderButton() {
  render(
    <FollowButton profileId="p1" name="Ana" status={null} labels={labels} />,
  );
  return screen.getByRole("button", { name: "Seguir Ana" });
}

describe("FollowButton", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("BLOCKED mostra o aviso de quem bloqueou, não o texto do servidor", async () => {
    follow.mockResolvedValue({
      ok: false,
      error: { code: "BLOCKED", message: "texto do servidor" },
    });
    await userEvent.click(renderButton());
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(labels.blocked),
    );
  });

  it("mostra a mensagem de limite e mantém o estado e o botão clicável", async () => {
    follow.mockResolvedValue({
      ok: false,
      error: { code: "RATE_LIMITED", message: "texto do servidor" },
    });
    const button = renderButton();
    await userEvent.click(button);

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(labels.rateLimited),
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Seguir Ana" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByText("Seguir")).toBeTruthy();
  });

  it("mantém a mensagem do servidor nos outros erros", async () => {
    follow.mockResolvedValue({
      ok: false,
      error: { code: "PROFILE_NOT_FOUND", message: "Perfil não encontrado." },
    });
    await userEvent.click(renderButton());
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Perfil não encontrado."),
    );
  });

  it("vira Seguindo quando o servidor aceita", async () => {
    follow.mockResolvedValue({ ok: true, value: { status: "accepted" } });
    await userEvent.click(renderButton());
    await screen.findByRole("button", { name: "Deixar de seguir Ana" });
    expect(toastSuccess).toHaveBeenCalledWith("Agora você segue Ana.");
  });
});
