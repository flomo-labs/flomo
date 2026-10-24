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

export type WatchedTimeUnit = "minutes" | "hours" | "days" | "months" | "years";

export type WatchedTimePart = { unit: WatchedTimeUnit; value: number };

// Da maior para a menor unidade, em minutos. Mês = 30 dias e ano = 365 dias:
// é só para o número do perfil caber e ler bem, não um calendário.
const UNIT_MINUTES: readonly [WatchedTimeUnit, number][] = [
  ["years", 365 * 24 * 60],
  ["months", 30 * 24 * 60],
  ["days", 24 * 60],
  ["hours", 60],
  ["minutes", 1],
];

// Tempo assistido na maior unidade que cabe mais a unidade logo abaixo, se
// sobrar algo ("1 ano 2 meses", "45 dias 20 h", "12 h 30 min", "45 min").
export function watchedTime(minutes: number): {
  primary: WatchedTimePart;
  secondary?: WatchedTimePart;
} {
  const total = Math.floor(Math.max(0, minutes));
  const found = UNIT_MINUTES.findIndex(([, size]) => total >= size);
  const index = found === -1 ? UNIT_MINUTES.length - 1 : found;
  const [unit, size] = UNIT_MINUTES[index];
  const primary = { unit, value: Math.floor(total / size) };
  const next = UNIT_MINUTES[index + 1];
  if (!next) return { primary };
  const rest = Math.floor((total % size) / next[1]);
  return rest > 0
    ? { primary, secondary: { unit: next[0], value: rest } }
    : { primary };
}
