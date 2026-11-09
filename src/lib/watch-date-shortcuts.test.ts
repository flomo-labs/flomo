import { describe, expect, it } from "vitest";
import {
  daysAgo,
  formatDayValue,
  isBeforeRelease,
  isoToMasked,
  isYearOnly,
  maskDateInput,
  parseMaskedDate,
} from "./watch-date-shortcuts";

describe("daysAgo", () => {
  it("volta um dia e uma semana", () => {
    expect(daysAgo("2026-11-07", 1)).toBe("2026-11-06");
    expect(daysAgo("2026-11-07", 7)).toBe("2026-10-31");
  });
  it("atravessa mês e ano", () => {
    expect(daysAgo("2026-01-03", 7)).toBe("2025-12-27");
    expect(daysAgo("2024-03-01", 1)).toBe("2024-02-29");
  });
});

describe("isBeforeRelease", () => {
  it("avisa quando o dia é anterior ao lançamento", () => {
    expect(isBeforeRelease("2020-05-01", "2020-06-10")).toBe(true);
    expect(isBeforeRelease("2020-06-10", "2020-06-10")).toBe(false);
  });
  it("compara só a precisão informada", () => {
    expect(isBeforeRelease("2020", "2020-06-10")).toBe(false);
    expect(isBeforeRelease("2019", "2020-06-10")).toBe(true);
  });
  it("não avisa sem data ou sem lançamento", () => {
    expect(isBeforeRelease("", "2020-06-10")).toBe(false);
    expect(isBeforeRelease("2020-01-01", null)).toBe(false);
  });
});

describe("formatDayValue", () => {
  it("formata dia e ano", () => {
    expect(formatDayValue("2026-11-07")).toBe("07/11/2026");
    expect(formatDayValue("2026")).toBe("2026");
  });
});

describe("campo de data digitado", () => {
  it("coloca as barras sozinho e ignora o que não é dígito", () => {
    expect(maskDateInput("0711")).toBe("07/11");
    expect(maskDateInput("07112026")).toBe("07/11/2026");
    expect(maskDateInput("07/11/20269")).toBe("07/11/2026");
    expect(maskDateInput("ab1")).toBe("1");
  });
  it("converte para AAAA-MM-DD só se o dia existe", () => {
    expect(parseMaskedDate("07/11/2026")).toBe("2026-11-07");
    expect(parseMaskedDate("29/02/2024")).toBe("2024-02-29");
    expect(parseMaskedDate("30/02/2024")).toBe("");
    expect(parseMaskedDate("07/11")).toBe("");
  });
  it("volta de AAAA-MM-DD para dd/mm/aaaa", () => {
    expect(isoToMasked("2026-11-07")).toBe("07/11/2026");
    expect(isoToMasked("")).toBe("");
    expect(isoToMasked("2026")).toBe("2026");
  });
});

describe("isYearOnly", () => {
  it("reconhece só o ano", () => {
    expect(isYearOnly("2026")).toBe(true);
    expect(isYearOnly("2026-11-07")).toBe(false);
    expect(isYearOnly("20/26")).toBe(false);
  });
});
