"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { START_COOKIE } from "../_profile/start-screen-path";
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

// Inicia o login com Google. A volta é em /auth/callback.
export async function signInWithGoogle(formData: FormData) {
  const callback = new URL("/auth/callback", await siteUrl());
  const next = safeNextPath(formData.get("next"));
  callback.searchParams.set("next", next);

  const auth = await getRequestAuth();
  const googleUrl = await auth.startGoogleSignIn(callback.toString());
  redirect(googleUrl ?? `/entrar?erro=google&next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const auth = await getRequestAuth();
  await auth.signOut();
  // O próximo login volta a cair na tela inicial escolhida.
  (await cookies()).delete(START_COOKIE);
  redirect("/");
}
