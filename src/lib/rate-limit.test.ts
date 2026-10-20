import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("bloqueia depois do limite e libera na janela seguinte", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000, maxKeys: 10 });
    expect(check("a", 0).allowed).toBe(true);
    expect(check("a", 100).allowed).toBe(true);
    expect(check("a", 200)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(check("a", 1000).allowed).toBe(true);
  });

  it("conta cada chave à parte", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 10 });
    expect(check("a", 0).allowed).toBe(true);
    expect(check("b", 0).allowed).toBe(true);
    expect(check("a", 1).allowed).toBe(false);
  });

  it("não passa de maxKeys chaves guardadas", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    check("a", 0);
    check("b", 1);
    check("c", 2);
    // "a" foi descartada para dar lugar a "c": volta a contar do zero.
    expect(check("a", 3).allowed).toBe(true);
  });
});
