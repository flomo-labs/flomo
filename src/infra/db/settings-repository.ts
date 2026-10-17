import { eq } from "drizzle-orm";
import type { StartScreen } from "@/contracts/profile";
import type { SettingsRepository } from "@/domain/profile/ports";
import type { Tx } from "./client";
import { userSettings } from "./schema";

// Recebe a transação do `withUser`, nunca o cliente direto (ADR-003).
export function createSettingsRepository(tx: Tx): SettingsRepository {
  return {
    async getStartScreen(userId) {
      const [row] = await tx
        .select({ startScreen: userSettings.startScreen })
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      return (row?.startScreen as StartScreen | undefined) ?? "home";
    },

    async setStartScreen(userId, startScreen) {
      await tx
        .insert(userSettings)
        .values({ userId, startScreen })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { startScreen },
        });
    },
  };
}
