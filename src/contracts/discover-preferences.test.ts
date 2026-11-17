import { describe, expect, it } from "vitest";
import {
  resolveDiscoverOrder,
  saveDiscoverPreferencesInputSchema,
  storedDiscoverPreferencesSchema,
} from "./discover-preferences";

describe("storedDiscoverPreferencesSchema", () => {
  it("ignora id desconhecido e repetição ao ler", () => {
    expect(
      storedDiscoverPreferencesSchema.parse({
        order: ["now_playing", "antiga", "now_playing", "trending"],
        hidden: ["???"],
      }),
    ).toEqual({ order: ["now_playing", "trending"], hidden: [] });
  });
});

describe("saveDiscoverPreferencesInputSchema", () => {
  it("aceita ids conhecidos", () => {
    expect(
      saveDiscoverPreferencesInputSchema.safeParse({
        order: ["now_playing", "trending"],
        hidden: ["trending"],
      }).success,
    ).toBe(true);
  });

  it("rejeita id desconhecido e repetido ao gravar", () => {
    expect(
      saveDiscoverPreferencesInputSchema.safeParse({
        order: ["xyz"],
        hidden: [],
      }).success,
    ).toBe(false);
    expect(
      saveDiscoverPreferencesInputSchema.safeParse({
        order: ["trending", "trending"],
        hidden: [],
      }).success,
    ).toBe(false);
  });
});

describe("resolveDiscoverOrder", () => {
  it("sem preferência usa a ordem padrão", () => {
    expect(resolveDiscoverOrder([])).toEqual(["trending", "now_playing"]);
  });

  it("lista que a preferência não conhece entra no fim", () => {
    expect(resolveDiscoverOrder(["now_playing"])).toEqual([
      "now_playing",
      "trending",
    ]);
  });

  it("ignora repetição e id desconhecido na entrada", () => {
    expect(
      resolveDiscoverOrder([
        "now_playing",
        "now_playing",
        "xyz" as unknown as "trending",
      ]),
    ).toEqual(["now_playing", "trending"]);
  });
});
