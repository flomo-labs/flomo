import { describe, expect, it } from "vitest";
import { ROADMAP_STATUS_LABEL, roadmap } from "./roadmap";

describe("roadmap", () => {
  it("tem ids únicos", () => {
    const ids = roadmap.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tem título, descrição e um status conhecido em todo item", () => {
    for (const item of roadmap) {
      expect(item.title.trim()).not.toBe("");
      expect(item.description.trim()).not.toBe("");
      expect(ROADMAP_STATUS_LABEL[item.status]).toBeDefined();
    }
  });
});
