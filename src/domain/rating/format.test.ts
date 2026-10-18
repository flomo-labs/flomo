import { describe, expect, it } from "vitest";
import { formatAverageStars, formatStars } from "./format";

describe("formatStars", () => {
  it("formata meias estrelas em pt-BR", () => {
    expect(formatStars(1)).toBe("0,5");
    expect(formatStars(7)).toBe("3,5");
    expect(formatStars(10)).toBe("5");
  });

  it("lanca erro para valores invalidos", () => {
    expect(() => formatStars(0)).toThrow(RangeError);
    expect(() => formatStars(11)).toThrow(RangeError);
    expect(() => formatStars(2.5)).toThrow(RangeError);
  });
});

describe("formatAverageStars", () => {
  it("mostra uma casa decimal em pt-BR", () => {
    expect(formatAverageStars(7)).toBe("3,5");
    expect(formatAverageStars(6.4)).toBe("3,2");
    expect(formatAverageStars(10)).toBe("5,0");
  });

  it("lança erro fora de 1 a 10", () => {
    expect(() => formatAverageStars(0.5)).toThrow(RangeError);
    expect(() => formatAverageStars(Number.NaN)).toThrow(RangeError);
  });
});
