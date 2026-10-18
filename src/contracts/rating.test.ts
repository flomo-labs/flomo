import { describe, expect, it } from "vitest";
import {
  deleteRatingInputSchema,
  halfStarsSchema,
  setRatingInputSchema,
} from "./rating";

describe("halfStarsSchema", () => {
  it("aceita de 1 a 10", () => {
    expect(halfStarsSchema.parse(1)).toBe(1);
    expect(halfStarsSchema.parse(7)).toBe(7);
    expect(halfStarsSchema.parse(10)).toBe(10);
  });

  it("rejeita fora do intervalo e nao inteiros", () => {
    expect(halfStarsSchema.safeParse(0).success).toBe(false);
    expect(halfStarsSchema.safeParse(11).success).toBe(false);
    expect(halfStarsSchema.safeParse(3.5).success).toBe(false);
  });
});

describe("entradas de nota", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("aceita nota de filme (titleId) ou de episódio (episodeId)", () => {
    expect(setRatingInputSchema.safeParse({ titleId: id, halfStars: 7 }).success).toBe(true);
    expect(setRatingInputSchema.safeParse({ episodeId: id, halfStars: 7 }).success).toBe(true);
    expect(setRatingInputSchema.safeParse({ halfStars: 7 }).success).toBe(false);
    expect(setRatingInputSchema.safeParse({ titleId: id, halfStars: 11 }).success).toBe(false);
  });

  it("apagar exige titleId ou episodeId", () => {
    expect(deleteRatingInputSchema.safeParse({ titleId: id }).success).toBe(true);
    expect(deleteRatingInputSchema.safeParse({ episodeId: id }).success).toBe(true);
    expect(deleteRatingInputSchema.safeParse({}).success).toBe(false);
  });
});
