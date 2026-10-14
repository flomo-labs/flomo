import { describe, expect, it } from "vitest";
import { parseBearerToken } from "./bearer";

describe("parseBearerToken", () => {
  it("lê o token do cabeçalho", () => {
    expect(parseBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(parseBearerToken("bearer abc")).toBe("abc");
  });

  it("devolve null sem cabeçalho ou com outro esquema", () => {
    for (const value of [null, "", "Basic abc", "Bearerabc"]) {
      expect(parseBearerToken(value)).toBeNull();
    }
  });

  it("marca como inválido o Bearer malformado", () => {
    for (const value of ["Bearer", "Bearer ", "Bearer a b"]) {
      expect(parseBearerToken(value)).toBe("invalid");
    }
  });
});
