import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "../../_auth/redirect";
import { resolveSiteUrl } from "../../_auth/site-url";
import { getRequestAuth, toCurrentUser } from "../../_auth/session";
import { destinationAfterLogin } from "../../_profile/queries";
import {
  START_COOKIE,
  START_COOKIE_OPTIONS,
} from "../../_profile/start-screen-path";

// Volta do Google: troca o código pela sessão (grava o cookie) e manda quem
// ainda tem handle provisório escolher o definitivo.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const site =
    resolveSiteUrl(process.env, request.nextUrl.host) ?? request.nextUrl.origin;
  const failure = NextResponse.redirect(
    new URL(`/entrar?erro=google&next=${encodeURIComponent(next)}`, site),
  );

  if (!code) return failure;
  const auth = await getRequestAuth();
  const user = toCurrentUser(await auth.completeSignIn(code));
  if (!user) return failure;

  const response = NextResponse.redirect(
    new URL(await destinationAfterLogin(user, next), site),
  );
  // A tela inicial já veio na resposta do login: a primeira entrada da
  // sessão não precisa de outro redirecionamento.
  response.cookies.set(START_COOKIE, "1", START_COOKIE_OPTIONS);
  return response;
}
