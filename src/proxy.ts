import { type NextRequest, NextResponse } from "next/server";
import { createCookieAuth } from "@/infra/auth/supabase";
import {
  FOLLOWING_PATH,
  shouldRedirectToStart,
} from "./app/_profile/start-screen-path";

// Renova o token de sessão antes da renderização e grava os cookies novos na
// resposta (Server Components não conseguem gravar cookies). Não decide
// acesso: cada página, Server Action e rota confere o usuário por conta
// própria (ver app/_auth/session.ts).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const auth = createCookieAuth({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet, headers) {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
      // Resposta com cookie de sessão nunca pode ir para cache compartilhado.
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    },
  });

  const claims = await auth.getClaims();

  // Quem está logado não vê a landing: a raiz leva ao Seguintes.
  if (
    shouldRedirectToStart({
      method: request.method,
      pathname: request.nextUrl.pathname,
      fetchMode: request.headers.get("sec-fetch-mode"),
      fetchDest: request.headers.get("sec-fetch-dest"),
      signedIn: claims !== null,
    })
  ) {
    const redirect = NextResponse.redirect(
      new URL(FOLLOWING_PATH, request.url),
    );
    // Mantém os cookies de sessão renovados acima.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    redirect.headers.set("cache-control", "private, no-store");
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, imagens e as sugestões da busca (pública,
    // sem sessão, e a resposta vai para o cache compartilhado).
    "/((?!_next/static|_next/image|favicon.ico|api/sugestoes|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
