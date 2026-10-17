import {
  type StartScreen,
  setStartScreenInputSchema,
} from "@/contracts/profile";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { SettingsRepository } from "./ports";

// Tela inicial preferida: onde o usuário cai ao entrar e no menu "Início".
// O logo do site leva sempre à Home, qualquer que seja a escolha.
export async function getStartScreen(
  deps: { settings: SettingsRepository },
  user: AuthenticatedUser,
): Promise<Result<StartScreen, never>> {
  return ok(await deps.settings.getStartScreen(user.id));
}

export async function setStartScreen(
  deps: { settings: SettingsRepository },
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ startScreen: StartScreen }, "INVALID_INPUT">> {
  const parsed = setStartScreenInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Tela inicial inválida.");
  await deps.settings.setStartScreen(user.id, parsed.data.startScreen);
  return ok({ startScreen: parsed.data.startScreen });
}
