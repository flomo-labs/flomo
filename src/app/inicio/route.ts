import { type NextRequest, NextResponse } from "next/server";
import { resolveSiteUrl } from "../_auth/site-url";
import { getCurrentUser } from "../_auth/session";
import { FOLLOWING_PATH } from "../_profile/start-screen-path";

// Endereço antigo da tela inicial (favoritos e links salvos): leva ao
// Seguintes, ou à landing para quem não está logado.
export async function GET(request: NextRequest) {
  const site =
    resolveSiteUrl(process.env, request.nextUrl.host) ?? request.nextUrl.origin;
  const user = await getCurrentUser();

  const response = NextResponse.redirect(
    new URL(user ? FOLLOWING_PATH : "/", site),
  );
  response.headers.set("cache-control", "private, no-store");
  return response;
}
