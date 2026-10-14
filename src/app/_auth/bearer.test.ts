import { describe, expect, it } from "vitest";
import { parseBearerToken } from "./bearer";

describe("parseBearerToken", () => {
  it("lê o token do cabeçalho", () => {
    expect(parseBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(parseBearerToken("bearer abc")).toBe("abc");
  });

  it("devolve null para cabeçalho ausente ou de outro esquema", () => {
    for (const value of [
      null,
      "",
      "Bearer",
      "Bearer ",
      "Basic abc",
      "Bearer a b",
    ]) {
      expect(parseBearerToken(value)).toBeNull();
    }
  });
});
