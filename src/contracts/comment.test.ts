import { describe, expect, it } from "vitest";
import {
  COMMENT_MAX_LENGTH,
  commentBodySchema,
  createCommentInputSchema,
} from "./comment";

describe("commentBodySchema", () => {
  it("corta as pontas em branco", () => {
    expect(commentBodySchema.parse("  Gostei.\n")).toBe("Gostei.");
  });

  it("recusa texto vazio ou só com espaços e quebras de linha", () => {
    for (const body of ["", "   ", "\n\t \n", " ", "\u0085"]) {
      expect(commentBodySchema.safeParse(body).success).toBe(false);
    }
  });

  it("aceita até o limite e recusa acima dele", () => {
    expect(commentBodySchema.safeParse("a".repeat(COMMENT_MAX_LENGTH)).success).toBe(true);
    expect(commentBodySchema.safeParse("a".repeat(COMMENT_MAX_LENGTH + 1)).success).toBe(false);
  });

  it("conta caracteres como o banco, não unidades UTF-16", () => {
    // Cada emoji ocupa duas unidades UTF-16 e um caractere.
    expect(commentBodySchema.safeParse("😀".repeat(COMMENT_MAX_LENGTH)).success).toBe(true);
    expect(commentBodySchema.safeParse("😀".repeat(COMMENT_MAX_LENGTH + 1)).success).toBe(false);
  });

  it("conta o limite depois de cortar as pontas", () => {
    const padded = ` ${"a".repeat(COMMENT_MAX_LENGTH)} `;
    expect(commentBodySchema.safeParse(padded).success).toBe(true);
  });
});

describe("createCommentInputSchema", () => {
  const titleId = "11111111-1111-4111-8111-111111111111";

  it("o aviso de spoiler começa desligado", () => {
    expect(createCommentInputSchema.parse({ titleId, body: "Oi" })).toEqual({
      titleId,
      body: "Oi",
      containsSpoilers: false,
    });
  });

  it("exige um título válido", () => {
    expect(createCommentInputSchema.safeParse({ titleId: "x", body: "Oi" }).success).toBe(false);
  });
});
