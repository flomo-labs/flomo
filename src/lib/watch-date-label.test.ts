import { describe, expect, it } from "vitest";
import { watchDateLabel } from "./watch-date-label";

describe("watchDateLabel", () => {
  it("usa o dia de São Paulo, mesmo perto da meia-noite UTC", () => {
    expect(watchDateLabel(new Date("2026-10-17T01:30:00Z"), "exact")).toBe(
      "16/10/2026",
    );
  });

  it("mostra a data aproximada na precisão guardada", () => {
    expect(watchDateLabel(new Date("2019-03-01T12:00:00Z"), "day")).toBe(
      "01/03/2019",
    );
    expect(watchDateLabel(new Date("2019-03-01T12:00:00Z"), "month")).toBe(
      "março de 2019",
    );
    expect(watchDateLabel(new Date("2019-01-01T12:00:00Z"), "year")).toBe(
      "2019",
    );
  });

  it("sem data", () => {
    expect(watchDateLabel(null, "unknown")).toBe("Sem data");
  });
});
