import { type NextRequest, NextResponse } from "next/server";
import { getStartScreen } from "@/domain/profile/start-screen";
import { withUser } from "@/infra/db/client";
import { createSettingsRepository } from "@/infra/db/settings-repository";
import { resolveSiteUrl } from "../_auth/site-url";
import { getCurrentUser } from "../_auth/session";
import {
  START_COOKIE,
  START_COOKIE_OPTIONS,
  START_SCREEN_PATH,
} from "../_profile/start-screen-path";

// "Início": leva o usuário à tela que ele escolheu (Home ou Seguintes) e
// marca na sessão que a primeira entrada já passou. Quem não está logado,
// ou cuja preferência não pôde ser lida, vai para a Home.
export async function GET(request: NextRequest) {
  const site =
    resolveSiteUrl(process.env, request.nextUrl.host) ?? request.nextUrl.origin;
  let path = START_SCREEN_PATH.home;

  const user = await getCurrentUser();
  if (user) {
    try {
      const result = await withUser(user.claims, (tx) =>
        getStartScreen(
          { settings: createSettingsRepository(tx) },
          { id: user.id },
        ),
      );
      if (result.ok) path = START_SCREEN_PATH[result.value];
    } catch (error) {
      console.error("Falha ao ler a tela inicial:", error);
    }
  }

  const response = NextResponse.redirect(new URL(path, site));
  response.cookies.set(START_COOKIE, "1", START_COOKIE_OPTIONS);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
