import { type NextRequest, NextResponse } from "next/server";
import { isProvisionalHandle } from "@/contracts/profile";
import { safeNextPath } from "../../_auth/redirect";
import { getRequestAuth, toCurrentUser } from "../../_auth/session";
import { getOwnProfile } from "../../_profile/queries";

// Volta do Google: troca o código pela sessão (grava o cookie) e manda quem
// ainda tem handle provisório escolher o definitivo.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const failure = NextResponse.redirect(new URL("/entrar?erro=google", site));

  if (!code) return failure;
  const auth = await getRequestAuth();
  const user = toCurrentUser(await auth.completeSignIn(code));
  if (!user) return failure;

  const profile = await getOwnProfile(user);
  const destination =
    !profile || isProvisionalHandle(profile.handle)
      ? `/cadastro?next=${encodeURIComponent(next)}`
      : next;
  return NextResponse.redirect(new URL(destination, site));
}
