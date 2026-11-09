import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth }),
}));

import { createCookieAuth } from ".";

function adapter() {
  return createCookieAuth({ getAll: () => [], setAll: () => {} });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave");
  Object.values(auth).forEach((fn) => fn.mockReset());
  auth.signOut.mockResolvedValue({ error: null });
});

describe("requestPasswordReset", () => {
  it("pede o link com a volta informada", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await adapter().requestPasswordReset("a@b.com", "http://x/y");
    expect(result).toEqual({ ok: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@b.com", {
      redirectTo: "http://x/y",
    });
  });

  it("só o limite de envios vira falha; o resto não aparece", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({
      error: { code: "over_email_send_rate_limit" },
    });
    expect(await adapter().requestPasswordReset("a@b.com", "u")).toEqual({
      ok: false,
      code: "RATE_LIMITED",
    });
    auth.resetPasswordForEmail.mockResolvedValueOnce({
      error: { code: "user_not_found" },
    });
    expect(await adapter().requestPasswordReset("a@b.com", "u")).toEqual({
      ok: false,
      code: "UNKNOWN",
    });
  });
});

describe("updatePassword", () => {
  it("troca a senha e encerra as outras sessões", async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    expect(await adapter().updatePassword("senha-nova-123")).toEqual({
      ok: true,
    });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("traduz senha fraca e senha igual à atual, sem encerrar sessões", async () => {
    auth.updateUser.mockResolvedValueOnce({ error: { code: "weak_password" } });
    expect(await adapter().updatePassword("x")).toEqual({
      ok: false,
      code: "WEAK_PASSWORD",
    });
    auth.updateUser.mockResolvedValueOnce({ error: { code: "same_password" } });
    expect(await adapter().updatePassword("x")).toEqual({
      ok: false,
      code: "SAME_PASSWORD",
    });
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});

describe("addEmailAndPassword", () => {
  it("define e-mail e senha e fica pendente da confirmação", async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    expect(
      await adapter().addEmailAndPassword("a@b.com", "senha-123456", "u"),
    ).toEqual({ ok: true, pending: true });
    expect(auth.updateUser).toHaveBeenCalledWith(
      { email: "a@b.com", password: "senha-123456" },
      { emailRedirectTo: "u" },
    );
  });

  it("e-mail de outra conta responde igual, sem revelar a conta", async () => {
    auth.updateUser.mockResolvedValue({ error: { code: "email_exists" } });
    expect(
      await adapter().addEmailAndPassword("a@b.com", "senha-123456", "u"),
    ).toEqual({ ok: true, pending: true });
  });

  it("repassa outras falhas", async () => {
    auth.updateUser.mockResolvedValue({ error: { code: "weak_password" } });
    expect(await adapter().addEmailAndPassword("a@b.com", "x", "u")).toEqual({
      ok: false,
      code: "WEAK_PASSWORD",
    });
  });
});
