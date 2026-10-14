import { type NextRequest, NextResponse } from "next/server";
import { createCookieAuth } from "@/infra/auth/supabase";

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

  await auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
