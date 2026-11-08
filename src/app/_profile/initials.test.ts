import { describe, expect, it } from "vitest";
import { profileInitials } from "./initials";

describe("profileInitials", () => {
  it("usa a primeira e a última palavra do nome", () => {
    expect(profileInitials("Maria Souza", "maria")).toBe("MS");
    expect(profileInitials("maria de souza lima", "maria")).toBe("ML");
  });

  it("usa uma letra com nome de uma palavra só", () => {
    expect(profileInitials("Maria", "maria")).toBe("M");
    expect(profileInitials("  érica  ", "erica")).toBe("É");
  });

  it("cai para o @usuário sem nome", () => {
    expect(profileInitials(null, "maria")).toBe("MA");
    expect(profileInitials("   ", "maria")).toBe("MA");
  });

  it("devolve ? sem nome nem @usuário", () => {
    expect(profileInitials("", "")).toBe("?");
    expect(profileInitials(undefined, undefined)).toBe("?");
  });
});
