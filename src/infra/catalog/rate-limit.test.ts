import { describe, expect, it } from "vitest";
import { createRateLimit } from "./rate-limit";

describe("createRateLimit", () => {
  it("recusa depois do máximo na janela e libera quando ela passa", () => {
    let t = 0;
    const limit = createRateLimit({ max: 2, windowMs: 1000, now: () => t });
    expect(limit.allow("a")).toBe(true);
    expect(limit.allow("a")).toBe(true);
    expect(limit.allow("a")).toBe(false);
    t = 1000;
    expect(limit.allow("a")).toBe(true);
  });

  it("conta cada chave à parte", () => {
    const limit = createRateLimit({ max: 1, windowMs: 1000, now: () => 0 });
    expect(limit.allow("a")).toBe(true);
    expect(limit.allow("b")).toBe(true);
    expect(limit.allow("a")).toBe(false);
  });

  it("recusa configuração inválida", () => {
    expect(() => createRateLimit({ max: 0, windowMs: 1000 })).toThrow();
    expect(() => createRateLimit({ max: 1, windowMs: 0 })).toThrow();
  });
});
