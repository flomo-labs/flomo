import { describe, expect, it } from "vitest";
import type { SignInMethod, SignInMethodsRepository } from "./ports";
import { unlinkSignInMethod } from "./unlink-sign-in-method";

function fakeMethods(initial: SignInMethod[]) {
  const linked = [...initial];
  const repo: SignInMethodsRepository = {
    async list() {
      return [...linked];
    },
    async unlink(method) {
      linked.splice(linked.indexOf(method), 1);
    },
  };
  return { repo, linked };
}

describe("unlinkSignInMethod", () => {
  it("desvincula o Google quando há e-mail e senha", async () => {
    const { repo, linked } = fakeMethods(["google", "email"]);

    const result = await unlinkSignInMethod({ methods: repo }, "google");

    expect(result).toEqual({ ok: true, value: null });
    expect(linked).toEqual(["email"]);
  });

  it("desvincula o e-mail quando há Google", async () => {
    const { repo, linked } = fakeMethods(["google", "email"]);

    await unlinkSignInMethod({ methods: repo }, "email");

    expect(linked).toEqual(["google"]);
  });

  it.each<SignInMethod>(["google", "email"])(
    "nunca deixa a conta sem forma de entrar (%s é a única)",
    async (only) => {
      const { repo, linked } = fakeMethods([only]);

      const result = await unlinkSignInMethod({ methods: repo }, only);

      expect(result).toMatchObject({
        ok: false,
        error: { code: "LAST_METHOD" },
      });
      expect(linked).toEqual([only]);
    },
  );

  it("recusa o que não está vinculado", async () => {
    const { repo, linked } = fakeMethods(["google"]);

    const result = await unlinkSignInMethod({ methods: repo }, "email");

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_LINKED" } });
    expect(linked).toEqual(["google"]);
  });
});
