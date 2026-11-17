import { describe, expect, it } from "vitest";
import {
  COMMENT_MAX_LENGTH,
  commentBodySchema,
  createCommentInputSchema,
  listTitleCommentsInputSchema,
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

describe("alvo e página dos comentários", () => {
  const id = "aaaaaaaa-0000-4000-8000-000000000001";
  const other = "bbbbbbbb-0000-4000-8000-000000000001";

  it("aceita temporada ou episódio, nunca os dois", () => {
    const base = { titleId: id, body: "Oi" };
    expect(createCommentInputSchema.safeParse({ ...base, seasonId: other }).success).toBe(true);
    expect(createCommentInputSchema.safeParse({ ...base, episodeId: other }).success).toBe(true);
    expect(
      createCommentInputSchema.safeParse({ ...base, seasonId: other, episodeId: other }).success,
    ).toBe(false);
  });

  it("a lista tem tamanho padrão, limite e cursor com microssegundos", () => {
    expect(listTitleCommentsInputSchema.parse({ titleId: id })).toMatchObject({ limit: 20, after: null });
    expect(listTitleCommentsInputSchema.safeParse({ titleId: id, limit: 51 }).success).toBe(false);
    const at = "2026-11-17T04:00:00.123456Z";
    expect(listTitleCommentsInputSchema.safeParse({ titleId: id, after: { at, id: other } }).success).toBe(true);
    expect(
      listTitleCommentsInputSchema.safeParse({ titleId: id, after: { at: "2026-11-17T04:00:00.123Z", id: other } }).success,
    ).toBe(false);
    expect(
      listTitleCommentsInputSchema.safeParse({ titleId: id, after: { at: "9999-99-99T99:99:99.123456Z", id: other } }).success,
    ).toBe(false);
  });
});
