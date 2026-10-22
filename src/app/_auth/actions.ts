"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "./redirect";
import { resolveSiteUrl } from "./site-url";
import { getRequestAuth } from "./session";

async function siteUrl() {
  const requestHeaders = await headers();
  const url = resolveSiteUrl(
    process.env,
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  if (!url) {
    throw new Error(
      "URL do site indefinida: defina NEXT_PUBLIC_SITE_URL em Production e no .env.local.",
    );
  }
  return url;
}

async function startGoogleSignIn(
  formData: FormData,
  options: { selectAccount?: boolean } = {},
) {
  const callback = new URL("/auth/callback", await siteUrl());
  const next = safeNextPath(formData.get("next"));
  callback.searchParams.set("next", next);

  const auth = await getRequestAuth();
  const googleUrl = await auth.startGoogleSignIn(callback.toString(), options);
  redirect(googleUrl ?? `/entrar?erro=google&next=${encodeURIComponent(next)}`);
}

// Inicia o login com Google. A volta é em /auth/callback.
export async function signInWithGoogle(formData: FormData) {
  await startGoogleSignIn(formData);
}

// Nova entrada de quem já está logado, antes de uma ação sem volta (excluir a
// conta): o Google mostra a escolha de conta, e a volta segue para `next`.
export async function reauthenticateWithGoogle(formData: FormData) {
  await startGoogleSignIn(formData, { selectAccount: true });
}

export async function signOut() {
  const auth = await getRequestAuth();
  await auth.signOut();
  redirect("/");
}
