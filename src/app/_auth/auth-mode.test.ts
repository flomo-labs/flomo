import { describe, expect, it } from "vitest";
import { authModeFromParam, passwordsMatch } from "./auth-mode";

describe("authModeFromParam", () => {
  it("abre em criar conta só com modo=criar", () => {
    expect(authModeFromParam("criar")).toBe("signUp");
  });

  it("abre em entrar nos demais casos", () => {
    expect(authModeFromParam(undefined)).toBe("signIn");
    expect(authModeFromParam("entrar")).toBe("signIn");
    expect(authModeFromParam("outro")).toBe("signIn");
    expect(authModeFromParam(["criar", "criar"])).toBe("signIn");
  });
});

describe("passwordsMatch", () => {
  it("aceita senhas iguais", () => {
    expect(passwordsMatch("senha-segura-1", "senha-segura-1")).toBe(true);
  });

  it("recusa senhas diferentes, inclusive por maiúscula ou espaço", () => {
    expect(passwordsMatch("senha-segura-1", "senha-segura-2")).toBe(false);
    expect(passwordsMatch("Senha-segura-1", "senha-segura-1")).toBe(false);
    expect(passwordsMatch("senha-segura-1", "senha-segura-1 ")).toBe(false);
  });
});
