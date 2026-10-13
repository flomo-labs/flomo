import { describe, expect, it } from "vitest";
import { halfStarsSchema } from "./rating";

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
