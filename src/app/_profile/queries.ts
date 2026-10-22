import "server-only";
import { cache } from "react";
import { isProvisionalHandle } from "@/contracts/profile";
import { getProfilePage } from "@/domain/profile/profile-page";
import { withUser } from "@/infra/db/client";
import {
  createProfileRepository,
  findOwnProfile,
} from "@/infra/db/profile-repository";
import type { CurrentUser } from "../_auth/session";
import { FOLLOWING_PATH } from "./start-screen-path";

// Uma consulta por requisição: o cabeçalho e a barra do celular usam o mesmo.
export const getOwnProfile = cache((user: CurrentUser) =>
  withUser(user.claims, (tx) => findOwnProfile(tx, user.id)),
);

// Página do perfil de alguém (ou o próprio), com as regras de visibilidade.
export function loadProfilePage(user: CurrentUser, handle: string) {
  return withUser(user.claims, (tx) =>
    getProfilePage({ profiles: createProfileRepository(tx) }, user, handle),
  );
}

// Endereço público do perfil; /@handle é reescrito para /perfil/handle
// (next.config.ts), porque pastas com @ são slots no App Router.
export function profilePath(handle: string) {
  return `/@${handle}`;
}

// Para onde mandar quem acabou de entrar. Sem destino pedido (`next` = "/"),
// vale o Seguintes, já na resposta do login, sem um segundo redirecionamento
// depois. Quem ainda tem handle provisório (ou
// cujo perfil não pôde ser lido) passa antes por /cadastro, que confere de
// novo e segue para o destino.
export async function destinationAfterLogin(
  user: CurrentUser,
  next: string,
): Promise<string> {
  const target = next === "/" ? FOLLOWING_PATH : next;
  // Cadastro novo: segue para o destino pedido (o Seguintes, por padrão).
  const toSignup = `/cadastro?next=${encodeURIComponent(next)}`;
  try {
    const profile = await getOwnProfile(user);
    return !profile || isProvisionalHandle(profile.handle) ? toSignup : target;
  } catch {
    return toSignup;
  }
}
