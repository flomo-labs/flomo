import { type NextRequest, NextResponse } from "next/server";
import { resolveSiteUrl } from "../_auth/site-url";
import { getCurrentUser } from "../_auth/session";
import {
  FOLLOWING_PATH,
  START_COOKIE,
  START_COOKIE_OPTIONS,
} from "../_profile/start-screen-path";

// Leva o usuário ao Seguintes e marca na sessão que a primeira entrada já
// passou. Quem não está logado vai para a landing.
export async function GET(request: NextRequest) {
  const site =
    resolveSiteUrl(process.env, request.nextUrl.host) ?? request.nextUrl.origin;
  const user = await getCurrentUser();

  const response = NextResponse.redirect(
    new URL(user ? FOLLOWING_PATH : "/", site),
  );
  response.cookies.set(START_COOKIE, "1", START_COOKIE_OPTIONS);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
