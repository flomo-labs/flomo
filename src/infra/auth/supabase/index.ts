import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { JwtClaims } from "@/infra/db/client";

// Adaptador do Supabase Auth: o único lugar que importa o SDK
// (docs/troca-de-ferramentas.md). Só cuida da sessão; dados passam pelo
// Drizzle com `withUser` (a Data API está desligada).

export type AuthCookies = CookieMethodsServer;

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY precisam estar definidas.",
    );
  }
  return { url, key };
}

// Todo o fluxo de login roda no servidor (Server Actions, route handler e
// proxy), então o navegador nunca precisa ler o cookie de sessão: ele é
// HttpOnly, Secure em produção e SameSite=Lax (ADR-003, seção 5).
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

function toClaims(claims: Record<string, unknown> | undefined) {
  if (!claims || typeof claims.sub !== "string") return null;
  return claims as JwtClaims;
}

// Sessão ligada aos cookies de uma requisição. Criar uma por requisição,
// nunca compartilhar.
export function createCookieAuth(cookies: AuthCookies) {
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies,
    cookieOptions: SESSION_COOKIE_OPTIONS,
  });

  return {
    // Valida o JWT do cookie (nunca getSession(), que só lê o cookie) e
    // renova a sessão se estiver para expirar.
    async getClaims(): Promise<JwtClaims | null> {
      const { data } = await supabase.auth.getClaims();
      return toClaims(data?.claims);
    },

    // Login com Google (PKCE): devolve a URL do Google, ou null se falhar.
    // O verificador do PKCE fica num cookie até o callback.
    async startGoogleSignIn(redirectTo: string): Promise<string | null> {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      return error ? null : data.url;
    },

    // Callback do OAuth: troca o código pela sessão (grava os cookies) e
    // devolve as claims do token novo, já validado.
    async completeSignIn(code: string): Promise<JwtClaims | null> {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) return null;
      return verifyAccessToken(data.session.access_token);
    },

    // Encerra a sessão só neste dispositivo.
    async signOut(): Promise<void> {
      await supabase.auth.signOut({ scope: "local" });
    },
  };
}

// Valida um token `Authorization: Bearer` (futuro app mobile), sem sessão.
// Um cliente para o processo todo: não guarda sessão, e assim o cache das
// chaves públicas (JWKS) é reaproveitado entre requisições.
let tokenClient: ReturnType<typeof createClient> | undefined;

export async function verifyAccessToken(
  token: string,
): Promise<JwtClaims | null> {
  if (!tokenClient) {
    const { url, key } = supabaseConfig();
    tokenClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  const { data } = await tokenClient.auth.getClaims(token);
  return toClaims(data?.claims);
}
