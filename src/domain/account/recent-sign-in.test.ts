import { describe, expect, it } from "vitest";
import { isRecentSignIn, RESET_PASSWORD_MAX_AGE_MS } from "./recent-sign-in";

const NOW = new Date("2026-11-12T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("isRecentSignIn", () => {
  it("aceita uma entrada de agora", () => {
    expect(isRecentSignIn(NOW, NOW, RESET_PASSWORD_MAX_AGE_MS)).toBe(true);
  });

  it("aceita no limite da janela", () => {
    const signedInAt = ago(RESET_PASSWORD_MAX_AGE_MS);
    expect(isRecentSignIn(signedInAt, NOW, RESET_PASSWORD_MAX_AGE_MS)).toBe(
      true,
    );
  });

  it("recusa a entrada mais antiga que a janela", () => {
    const signedInAt = ago(RESET_PASSWORD_MAX_AGE_MS + 1);
    expect(isRecentSignIn(signedInAt, NOW, RESET_PASSWORD_MAX_AGE_MS)).toBe(
      false,
    );
  });

  it("recusa quando o token não traz a hora da entrada", () => {
    expect(isRecentSignIn(null, NOW, RESET_PASSWORD_MAX_AGE_MS)).toBe(false);
  });
});
