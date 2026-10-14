import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Importa só a lista de links: o componente usa next/link, que não roda no Vitest.
import { FOOTER_LINKS } from "./site-footer";

describe("rodapé", () => {
  it("só aponta para páginas que existem", () => {
    for (const { href } of FOOTER_LINKS) {
      const page = join(process.cwd(), "src/app/(publico)", href, "page.tsx");
      expect(existsSync(page), href).toBe(true);
    }
  });
});
