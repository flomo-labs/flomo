import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { AuthenticatedUser } from "@/domain/user";
import { createCookieAuth, verifyAccessToken } from "@/infra/auth/supabase";
import type { JwtClaims } from "@/infra/db/client";
import { parseBearerToken } from "./bearer";

export type CurrentUser = AuthenticatedUser & {
  // Vão para o `withUser`, que as entrega ao Postgres (RLS).
  claims: JwtClaims;
};

// Sessão do Supabase Auth ligada aos cookies desta requisição.
export async function getRequestAuth() {
  const store = await cookies();
  return createCookieAuth({
    getAll() {
      return store.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          store.set(name, value, options);
        }
      } catch {
        // Server Components não gravam cookies; o proxy renova a sessão.
      }
    },
  });
}

export function toCurrentUser(claims: JwtClaims | null): CurrentUser | null {
  return claims ? { id: claims.sub, claims } : null;
}

// Usuário da requisição, com o JWT validado. Aceita `Authorization: Bearer`
// (mobile) e, sem esse cabeçalho, o cookie de sessão (web). Resolvido uma vez
// por requisição.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // A validação do token compara a validade com o relógio (Date.now()), o
  // que não pode entrar em nenhum prerender com Cache Components: a sessão
  // só é lida na requisição de verdade.
  await connection();
  // Com token Bearer, ele decide sozinho (inválido = sem usuário, sem cair no
  // cookie). Sem Bearer, vale o cookie de sessão.
  const token = parseBearerToken((await headers()).get("authorization"));
  if (token === "invalid") return null;
  if (token !== null) return toCurrentUser(await verifyAccessToken(token));
  const auth = await getRequestAuth();
  return toCurrentUser(await auth.getClaims());
});

// Para páginas que exigem login: sem usuário, vai para /entrar e volta depois.
export async function requireUser(nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}
