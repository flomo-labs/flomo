import { describe, expect, it } from "vitest";
import { signedInAt } from ".";

const SUB = "11111111-1111-4111-8111-111111111111";

describe("signedInAt", () => {
  it("lê a hora da entrada do amr", () => {
    const claims = {
      sub: SUB,
      amr: [{ method: "oauth", timestamp: 1_792_670_400 }],
    };
    expect(signedInAt(claims)).toEqual(new Date(1_792_670_400 * 1000));
  });

  it("usa a entrada mais recente quando há mais de uma", () => {
    const claims = {
      sub: SUB,
      amr: [
        { method: "oauth", timestamp: 100 },
        { method: "password", timestamp: 300 },
        { method: "otp", timestamp: 200 },
      ],
    };
    expect(signedInAt(claims)).toEqual(new Date(300 * 1000));
  });

  it("devolve null sem hora no token", () => {
    expect(signedInAt({ sub: SUB })).toBeNull();
    expect(signedInAt({ sub: SUB, amr: ["oauth"] })).toBeNull();
    expect(signedInAt({ sub: SUB, amr: [{ method: "oauth" }] })).toBeNull();
    expect(signedInAt({ sub: SUB, amr: "oauth" })).toBeNull();
  });
});
