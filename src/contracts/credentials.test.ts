import { describe, expect, it } from "vitest";
import {
  emailCredentialsSchema,
  newPasswordSchema,
  passwordResetRequestSchema,
} from "./credentials";

describe("emailCredentialsSchema", () => {
  it("normaliza o e-mail (espaços e maiúsculas)", () => {
    const result = emailCredentialsSchema.parse({
      email: "  Ana@Exemplo.COM ",
      password: "12345678",
    });
    expect(result.email).toBe("ana@exemplo.com");
  });

  it("recusa e-mail inválido", () => {
    expect(
      emailCredentialsSchema.safeParse({ email: "ana", password: "12345678" })
        .success,
    ).toBe(false);
  });

  it("recusa senha curta", () => {
    expect(
      emailCredentialsSchema.safeParse({ email: "a@b.co", password: "1234567" })
        .success,
    ).toBe(false);
  });

  it("recusa senha acima de 72 bytes (conta bytes, não caracteres)", () => {
    const ok72 = "a".repeat(72);
    const bytes73 = "é".repeat(36) + "a"; // 36 * 2 + 1 = 73 bytes
    expect(
      emailCredentialsSchema.safeParse({ email: "a@b.co", password: ok72 })
        .success,
    ).toBe(true);
    expect(
      emailCredentialsSchema.safeParse({ email: "a@b.co", password: bytes73 })
        .success,
    ).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("aceita senhas válidas e iguais", () => {
    expect(
      newPasswordSchema.safeParse({
        password: "senha-nova-123",
        confirmPassword: "senha-nova-123",
      }).success,
    ).toBe(true);
  });

  it("recusa senhas diferentes", () => {
    const result = newPasswordSchema.safeParse({
      password: "senha-nova-123",
      confirmPassword: "senha-nova-124",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("PASSWORD_MISMATCH");
    }
  });

  it("recusa senha curta ou acima de 72 bytes", () => {
    expect(
      newPasswordSchema.safeParse({
        password: "curta",
        confirmPassword: "curta",
      }).success,
    ).toBe(false);
    const longa = "a".repeat(73);
    expect(
      newPasswordSchema.safeParse({ password: longa, confirmPassword: longa })
        .success,
    ).toBe(false);
  });
});

describe("passwordResetRequestSchema", () => {
  it("normaliza o e-mail e recusa formato inválido", () => {
    expect(
      passwordResetRequestSchema.parse({ email: "  A@B.com " }).email,
    ).toBe("a@b.com");
    expect(passwordResetRequestSchema.safeParse({ email: "x" }).success).toBe(
      false,
    );
  });
});
