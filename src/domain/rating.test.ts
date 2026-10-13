import { describe, expect, it } from "vitest";
import { formatStars } from "./rating";

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
