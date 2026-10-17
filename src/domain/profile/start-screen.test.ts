import { describe, expect, it } from "vitest";
import type { StartScreen } from "@/contracts/profile";
import type { SettingsRepository } from "./ports";
import { getStartScreen, setStartScreen } from "./start-screen";

const USER = { id: "11111111-1111-4111-8111-111111111111" };

function fakeSettings() {
  const saved = new Map<string, StartScreen>();
  const settings: SettingsRepository = {
    async getStartScreen(userId) {
      return saved.get(userId) ?? "home";
    },
    async setStartScreen(userId, startScreen) {
      saved.set(userId, startScreen);
    },
  };
  return { deps: { settings }, saved };
}

describe("tela inicial preferida", () => {
  it("sem escolha, vale a Home", async () => {
    const { deps } = fakeSettings();
    expect(await getStartScreen(deps, USER)).toEqual({
      ok: true,
      value: "home",
    });
  });

  it("grava a escolha de Seguintes e a devolve depois", async () => {
    const { deps } = fakeSettings();
    expect(
      await setStartScreen(deps, USER, { startScreen: "following" }),
    ).toEqual({ ok: true, value: { startScreen: "following" } });
    expect(await getStartScreen(deps, USER)).toEqual({
      ok: true,
      value: "following",
    });
  });

  it("recusa uma tela desconhecida e não grava nada", async () => {
    const { deps, saved } = fakeSettings();
    const result = await setStartScreen(deps, USER, { startScreen: "outra" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_INPUT");
    expect(saved.size).toBe(0);
  });
});
