import { describe, expect, it } from "vitest";
import { formatCommentDate } from "./format-comment-date";

describe("formatCommentDate", () => {
  it("usa o dia de Brasília, não o UTC", () => {
    // 02:00 UTC de 18/11 ainda é 17/11 em Brasília.
    expect(formatCommentDate(new Date("2026-11-18T02:00:00Z"))).toContain("17");
  });

  it("aceita texto ISO e devolve vazio para data inválida", () => {
    expect(formatCommentDate("2026-11-17T12:00:00Z")).toContain("2026");
    expect(formatCommentDate("não é data")).toBe("");
  });
});
