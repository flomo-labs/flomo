import "server-only";
import { isProvisionalHandle } from "@/contracts/profile";
import { getStartScreen } from "@/domain/profile/start-screen";
import { withUser } from "@/infra/db/client";
import { findOwnProfile } from "@/infra/db/profile-repository";
import { createSettingsRepository } from "@/infra/db/settings-repository";
import type { CurrentUser } from "../_auth/session";
import { START_SCREEN_PATH } from "./start-screen-path";

export function getOwnProfile(user: CurrentUser) {
  return withUser(user.claims, (tx) => findOwnProfile(tx, user.id));
}

// Para onde mandar quem acabou de entrar. Sem destino pedido (`next` = "/"),
// vale a tela inicial que o usuário escolheu, já na resposta do login, sem
// um segundo redirecionamento depois. Quem ainda tem handle provisório (ou
// cujo perfil não pôde ser lido) passa antes por /cadastro, que confere de
// novo e segue para o destino.
export async function destinationAfterLogin(
  user: CurrentUser,
  next: string,
): Promise<string> {
  const target =
    next === "/" ? START_SCREEN_PATH[await startScreenOrHome(user)] : next;
  // Cadastro novo ainda não escolheu tela inicial: segue para o destino pedido
  // (a Home, por padrão), nunca para uma preferência.
  const toSignup = `/cadastro?next=${encodeURIComponent(next)}`;
  try {
    const profile = await getOwnProfile(user);
    return !profile || isProvisionalHandle(profile.handle) ? toSignup : target;
  } catch {
    return toSignup;
  }
}

// Tela inicial escolhida pelo usuário (Home se nunca escolheu).
export async function getOwnStartScreen(user: CurrentUser) {
  const result = await withUser(user.claims, (tx) =>
    getStartScreen({ settings: createSettingsRepository(tx) }, { id: user.id }),
  );
  return result.ok ? result.value : "home";
}

// Igual, mas nunca falha: na dúvida, a Home (o login não pode quebrar por isso).
async function startScreenOrHome(user: CurrentUser) {
  try {
    return await getOwnStartScreen(user);
  } catch (error) {
    console.error("Falha ao ler a tela inicial:", error);
    return "home" as const;
  }
}
