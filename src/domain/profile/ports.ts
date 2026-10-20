import type { StartScreen, UpdateProfileInput } from "@/contracts/profile";

// Perfil como aparece na página do perfil (função app.profile_card, migration
// 0017). De perfil privado de outra pessoa vêm só nome, handle e foto: `bio`
// vem nula e `canSeeDetails` falso.
export type ProfileView = {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  canSeeDetails: boolean;
};

// Números do perfil (função app.profile_stats, migration 0016).
export type ProfileStats = {
  seriesCount: number;
  moviesCount: number;
  episodesCount: number;
  minutesWatched: number;
  ratingsCount: number;
};

// Porta de acesso aos perfis, implementada em infra/ (ADR-001). A
// implementação roda dentro do `withUser`, então o RLS também se aplica.
export interface ProfileRepository {
  // Algum outro perfil já usa este handle na forma sem `.` nem `_`?
  // Perfis privados de outros usuários podem não aparecer por causa do RLS;
  // nesse caso quem barra é o índice único, e `updateHandle` devolve "taken".
  isHandleTaken(
    normalizedHandle: string,
    exceptUserId: string,
  ): Promise<boolean>;

  updateHandle(
    userId: string,
    handle: string,
  ): Promise<"updated" | "taken" | "not_found">;

  // `null` se o handle não existe.
  findByHandle(handle: string): Promise<ProfileView | null>;

  // `null` quando a função não responde (mesmas regras de visibilidade).
  getStats(profileId: string): Promise<ProfileStats | null>;

  updateDetails(
    userId: string,
    details: UpdateProfileInput,
  ): Promise<"updated" | "not_found">;
}

// Preferências do usuário (tabela `user_settings`); só o dono as lê e altera.
export interface SettingsRepository {
  // Sem linha gravada, vale a tela de Seguintes.
  getStartScreen(userId: string): Promise<StartScreen>;
  setStartScreen(userId: string, startScreen: StartScreen): Promise<void>;
}
