import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("mantém caminhos do próprio site", () => {
    expect(safeNextPath("/configuracoes")).toBe("/configuracoes");
    expect(safeNextPath("/titulo/1?aba=2#x")).toBe("/titulo/1?aba=2#x");
  });

  it("troca por / o que aponta para outro site ou não é caminho", () => {
    for (const value of [
      "https://exemplo.invalid",
      "//exemplo.invalid",
      "/\\exemplo.invalid",
      "\\\\exemplo.invalid",
      "javascript:alert(1)",
      "configuracoes",
      "",
      null,
      undefined,
      42,
    ]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });
});
