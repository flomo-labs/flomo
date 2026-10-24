import {
  HANDLE_MAX_LENGTH,
  updateProfileInputSchema,
  type UpdateProfileInput,
} from "@/contracts/profile";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { ProfileRepository, ProfileStats, ProfileView } from "./ports";

export type ProfilePage = {
  profile: ProfileView;
  // Nulo quando o visitante não pode ver os detalhes (perfil privado).
  stats: ProfileStats | null;
  // O visitante é o dono (mostra o selo "privado" e o link de editar).
  isOwn: boolean;
};

const NOT_FOUND_MESSAGE = "Perfil não encontrado.";

// Mesmo formato do CHECK do banco; inclui os handles provisórios (`u_...`).
const HANDLE_IN_URL = /^[a-z0-9]+([._][a-z0-9]+)*$/;

// Página do perfil de alguém, só para quem entrou (decisão de 2026-10-18). De
// perfil privado de outra pessoa saem só nome, handle e foto, para que ela
// possa pedir para seguir (Fase 2.1); bio e números ficam com o dono.
export async function getProfilePage(
  deps: { profiles: ProfileRepository },
  viewer: AuthenticatedUser,
  rawHandle: string,
): Promise<Result<ProfilePage, "PROFILE_NOT_FOUND">> {
  const handle = rawHandle.trim().toLowerCase();
  if (handle.length > HANDLE_MAX_LENGTH || !HANDLE_IN_URL.test(handle)) {
    return fail("PROFILE_NOT_FOUND", NOT_FOUND_MESSAGE);
  }
  const profile = await deps.profiles.findByHandle(handle);
  if (!profile) return fail("PROFILE_NOT_FOUND", NOT_FOUND_MESSAGE);
  const stats = profile.canSeeDetails
    ? await deps.profiles.getStats(profile.id)
    : null;
  return ok({ profile, stats, isOwn: profile.id === viewer.id });
}

// Edição do nome de exibição, da bio e da privacidade, pelo próprio dono.
export async function updateProfile(
  deps: { profiles: ProfileRepository },
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<UpdateProfileInput, "INVALID_INPUT" | "PROFILE_NOT_FOUND">> {
  const parsed = updateProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID_INPUT", parsed.error.issues[0].message);
  }
  const outcome = await deps.profiles.updateDetails(user.id, parsed.data);
  if (outcome === "not_found") {
    return fail("PROFILE_NOT_FOUND", NOT_FOUND_MESSAGE);
  }
  return ok(parsed.data);
}

// Tempo assistido em horas inteiras e minutos restantes, para o número do
// perfil ("12 h 30 min").
export function watchedTime(minutes: number): {
  hours: number;
  minutes: number;
} {
  const total = Math.floor(Math.max(0, minutes));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}
