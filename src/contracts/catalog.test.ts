import { describe, expect, it } from "vitest";
import { SHELF_PROVIDERS } from "./catalog";

describe("SHELF_PROVIDERS", () => {
  it("está em ordem alfabética, sem repetição", () => {
    const names = SHELF_PROVIDERS.map((p) => p.name);
    expect(names).toEqual(
      [...names].sort((a, b) => a.localeCompare(b, "pt-BR")),
    );
    expect(new Set(SHELF_PROVIDERS.map((p) => p.id)).size).toBe(names.length);
    expect(names[0]).toBe("Apple TV");
  });
});
