import { type NextRequest, NextResponse } from "next/server";
import { RESET_PASSWORD_PATH, safeNextPath } from "../../_auth/redirect";
import { resolveSiteUrl } from "../../_auth/site-url";
import { getRequestAuth, toCurrentUser } from "../../_auth/session";
import { destinationAfterLogin } from "../../_profile/queries";

// Volta do Google: troca o código pela sessão (grava o cookie) e manda quem
// ainda tem handle provisório escolher o definitivo.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const site =
    resolveSiteUrl(process.env, request.nextUrl.host) ?? request.nextUrl.origin;
  // Link de redefinição de senha: sem sessão, a própria tela explica que o
  // link venceu e deixa pedir outro. Com sessão, vai direto para a senha nova
  // (mesmo com o @usuário provisório: antes de tudo, a conta é recuperada).
  const isReset = next === RESET_PASSWORD_PATH;
  const failure = NextResponse.redirect(
    new URL(
      isReset
        ? RESET_PASSWORD_PATH
        : `/entrar?erro=google&next=${encodeURIComponent(next)}`,
      site,
    ),
  );

  if (!code) return failure;
  const auth = await getRequestAuth();
  const user = toCurrentUser(await auth.completeSignIn(code));
  if (!user) return failure;
  if (isReset) return NextResponse.redirect(new URL(RESET_PASSWORD_PATH, site));

  return NextResponse.redirect(
    new URL(await destinationAfterLogin(user, next), site),
  );
}
