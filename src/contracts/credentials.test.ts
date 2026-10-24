import { describe, expect, it } from "vitest";
import { emailCredentialsSchema } from "./credentials";

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
