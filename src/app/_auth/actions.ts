"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "./redirect";
import { getRequestAuth } from "./session";

function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL não definida.");
  return url;
}

// Inicia o login com Google. A volta é em /auth/callback.
export async function signInWithGoogle(formData: FormData) {
  const callback = new URL("/auth/callback", siteUrl());
  callback.searchParams.set("next", safeNextPath(formData.get("next")));

  const auth = await getRequestAuth();
  const googleUrl = await auth.startGoogleSignIn(callback.toString());
  redirect(googleUrl ?? "/entrar?erro=google");
}

export async function signOut() {
  const auth = await getRequestAuth();
  await auth.signOut();
  redirect("/");
}
