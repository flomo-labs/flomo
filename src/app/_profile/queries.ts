import "server-only";
import { isProvisionalHandle } from "@/contracts/profile";
import { withUser } from "@/infra/db/client";
import { findOwnProfile } from "@/infra/db/profile-repository";
import type { CurrentUser } from "../_auth/session";

export function getOwnProfile(user: CurrentUser) {
  return withUser(user.claims, (tx) => findOwnProfile(tx, user.id));
}

// Para onde mandar quem acabou de entrar: quem ainda tem handle provisório
// (ou cujo perfil não pôde ser lido) passa antes por /cadastro, que confere
// de novo e segue para `next`.
export async function destinationAfterLogin(
  user: CurrentUser,
  next: string,
): Promise<string> {
  const toSignup = `/cadastro?next=${encodeURIComponent(next)}`;
  try {
    const profile = await getOwnProfile(user);
    return !profile || isProvisionalHandle(profile.handle) ? toSignup : next;
  } catch {
    return toSignup;
  }
}
