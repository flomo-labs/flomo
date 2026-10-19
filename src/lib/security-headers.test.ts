import { describe, expect, it } from "vitest";
import {
  ENFORCED_CSP,
  reportOnlyCsp,
  securityHeaders,
} from "./security-headers";

describe("securityHeaders", () => {
  it("bloqueia a página dentro de iframe de outro site", () => {
    const headers = new Map(
      securityHeaders(false).map((h) => [h.key, h.value]),
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("não restringe script nem formulário na CSP aplicada", () => {
    // Restringir script ou form-action sem testar quebraria a página ou o
    // login com Google: isso fica no Report-Only.
    expect(ENFORCED_CSP).not.toMatch(/script-src|default-src|form-action/);
  });

  it("libera eval só no desenvolvimento", () => {
    expect(reportOnlyCsp(true)).toContain("'unsafe-eval'");
    expect(reportOnlyCsp(false)).not.toContain("'unsafe-eval'");
  });

  it("aceita os pôsteres do TMDB", () => {
    expect(reportOnlyCsp(false)).toMatch(/img-src [^;]*https:\/\/image\.tmdb\.org/);
  });
});
