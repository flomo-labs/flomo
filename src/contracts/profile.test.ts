import { describe, expect, it } from "vitest";
import {
  handleSchema,
  isProvisionalHandle,
  normalizeHandle,
  updateProfileInputSchema,
} from "./profile";

describe("handleSchema", () => {
  it("aceita handles válidos", () => {
    for (const handle of [
      "renato",
      "renato.silva",
      "renato_s",
      "r2d2x",
      "a1b2c3d4e5f6g7h8i9j0",
    ]) {
      expect(handleSchema.parse(handle)).toBe(handle);
    }
  });

  it("normaliza maiúsculas e espaços nas pontas", () => {
    expect(handleSchema.parse("  Renato.Silva ")).toBe("renato.silva");
  });

  it("rejeita tamanho fora de 5 a 20", () => {
    expect(handleSchema.safeParse("abcd").success).toBe(false);
    expect(handleSchema.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("rejeita caracteres fora de a-z, 0-9, . e _", () => {
    for (const handle of [
      "renato-silva",
      "renato silva",
      "renatô",
      "renato@x",
    ]) {
      expect(handleSchema.safeParse(handle).success).toBe(false);
    }
  });

  it("exige começar e terminar com letra ou número", () => {
    for (const handle of [".renato", "_renato", "renato.", "renato_"]) {
      expect(handleSchema.safeParse(handle).success).toBe(false);
    }
  });

  it("rejeita separadores seguidos", () => {
    for (const handle of ["renato..silva", "renato._silva", "renato__silva"]) {
      expect(handleSchema.safeParse(handle).success).toBe(false);
    }
  });

  it("rejeita handles que colidem com os provisórios", () => {
    for (const handle of [
      "u_abc123def456",
      "u.abc123def456",
      "uabc123def456",
    ]) {
      expect(handleSchema.safeParse(handle).success).toBe(false);
    }
    // Fora o prefixo `u_`, só a forma exata dos provisórios é barrada.
    expect(handleSchema.parse("u.renato")).toBe("u.renato");
  });

  it("rejeita nomes reservados, mesmo com separadores", () => {
    for (const handle of ["admin", "ad.min", "em_breve", "flomo", "Login"]) {
      expect(handleSchema.safeParse(handle).success).toBe(false);
    }
  });
});

describe("normalizeHandle", () => {
  it("remove . e _", () => {
    expect(normalizeHandle("renato.silva")).toBe("renatosilva");
    expect(normalizeHandle("renato_silva")).toBe("renatosilva");
  });
});

describe("isProvisionalHandle", () => {
  it("reconhece o handle criado pelo trigger de cadastro", () => {
    expect(isProvisionalHandle("u_0a1b2c3d4e5f")).toBe(true);
  });

  it("não confunde handles escolhidos com provisórios", () => {
    for (const handle of [
      "renato",
      "u_0a1b2c3d4e5",
      "u.0a1b2c3d4e5f",
      "u_0A1B2C3D4E5F",
    ]) {
      expect(isProvisionalHandle(handle)).toBe(false);
    }
  });
});

describe("updateProfileInputSchema", () => {
  const base = {
    displayName: "Ana",
    bio: "Gosto de séries.",
    isPrivate: false,
  };

  it("corta as pontas e aceita até 50 e 160 caracteres", () => {
    const parsed = updateProfileInputSchema.parse({
      displayName: `  ${"n".repeat(50)}  `,
      bio: "b".repeat(160),
      isPrivate: true,
    });
    expect(parsed).toEqual({
      displayName: "n".repeat(50),
      bio: "b".repeat(160),
      isPrivate: true,
    });
  });

  it("conta caracteres como o banco (emoji de um código vale 1)", () => {
    expect(
      updateProfileInputSchema.safeParse({
        ...base,
        displayName: "🎬".repeat(50),
      }).success,
    ).toBe(true);
  });

  it("recusa acima do limite", () => {
    expect(
      updateProfileInputSchema.safeParse({
        ...base,
        displayName: "n".repeat(51),
      }).success,
    ).toBe(false);
    expect(
      updateProfileInputSchema.safeParse({ ...base, bio: "b".repeat(161) })
        .success,
    ).toBe(false);
  });

  it("vazio ou só espaços vira null", () => {
    expect(
      updateProfileInputSchema.parse({ ...base, displayName: "   ", bio: "" }),
    ).toMatchObject({ displayName: null, bio: null });
    expect(
      updateProfileInputSchema.parse({ ...base, bio: "\u0085" }).bio,
    ).toBeNull();
  });
});
