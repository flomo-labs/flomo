import { describe, expect, it } from "vitest";
import { formatCalendarDay } from "./format-calendar-day";

describe("formatCalendarDay", () => {
  it("segue a locale", () => {
    expect(formatCalendarDay("2026-11-10", "pt-BR")).toBe("10/11/2026");
    expect(formatCalendarDay("2026-11-10", "en-US")).toBe("11/10/2026");
  });
  it("devolve o valor quando não é um dia completo ou válido", () => {
    expect(formatCalendarDay("2026", "pt-BR")).toBe("2026");
    expect(formatCalendarDay("2026-02-31", "pt-BR")).toBe("2026-02-31");
  });
  it("cai no valor original com locale inválida", () => {
    expect(formatCalendarDay("2026-11-10", "xx-invalid-!")).toBe("2026-11-10");
  });
});
