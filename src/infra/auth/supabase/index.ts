import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type {
  AccountRepository,
  SignInMethod,
  SignInMethodsRepository,
} from "@/domain/account/ports";
import type { JwtClaims } from "@/infra/db/client";

// Adaptador do Supabase Auth: o único lugar que importa o SDK
// (docs/troca-de-ferramentas.md). Só cuida da sessão e da conta; dados passam
// pelo Drizzle com `withUser` (a Data API está desligada).

export type AuthCookies = CookieMethodsServer;

// Falhas esperadas do e-mail e senha, já traduzidas dos códigos do Supabase.
// A mensagem de login é a mesma para e-mail inexistente e senha errada.
export type EmailAuthFailure =
  | "EMAIL_TAKEN"
  | "WEAK_PASSWORD"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "UNKNOWN";

export type EmailAuthResult =
  | { ok: true; claims: JwtClaims }
  | { ok: false; code: EmailAuthFailure };

// No cadastro, "pending" é o e-mail de confirmação enviado: a sessão só
// nasce quando a pessoa abre o link (volta em /auth/callback).
export type EmailSignUpResult = EmailAuthResult | { ok: true; pending: true };

function toEmailFailure(code: string | undefined): EmailAuthFailure {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "EMAIL_TAKEN";
    case "weak_password":
      return "WEAK_PASSWORD";
    case "invalid_credentials":
    case "email_not_confirmed":
      return "INVALID_CREDENTIALS";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "RATE_LIMITED";
    default:
      return "UNKNOWN";
  }
}

const PROVIDER_BY_METHOD = { google: "google", email: "email" } as const;

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
    // O verificador do PKCE fica num cookie até o callback. `selectAccount`
    // faz o Google mostrar a escolha de conta mesmo com sessão aberta lá
    // (nova entrada antes de excluir a conta).
    async startGoogleSignIn(
      redirectTo: string,
      { selectAccount = false }: { selectAccount?: boolean } = {},
    ): Promise<string | null> {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          ...(selectAccount && { queryParams: { prompt: "select_account" } }),
        },
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

    // Cadastro com e-mail e senha. Com a confirmação ligada (padrão em
    // produção) não há sessão até a pessoa abrir o link do e-mail, e um
    // e-mail já cadastrado também devolve "pending", sem revelar que a conta
    // existe. Sem confirmação (Supabase local, E2E), a sessão já vem.
    async signUpWithEmail(
      email: string,
      password: string,
      emailRedirectTo: string,
    ): Promise<EmailSignUpResult> {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) return { ok: false, code: toEmailFailure(error.code) };
      if (!data.session) return { ok: true, pending: true };
      const claims = await verifyAccessToken(data.session.access_token);
      return claims ? { ok: true, claims } : { ok: false, code: "UNKNOWN" };
    },

    async signInWithEmail(
      email: string,
      password: string,
    ): Promise<EmailAuthResult> {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.session) {
        return { ok: false, code: toEmailFailure(error?.code) };
      }
      const claims = await verifyAccessToken(data.session.access_token);
      return claims ? { ok: true, claims } : { ok: false, code: "UNKNOWN" };
    },

    // Vincula o Google à conta logada (PKCE): devolve a URL do Google, ou null
    // se falhar. Exige "manual linking" ligado no Supabase.
    async startGoogleLink(redirectTo: string): Promise<string | null> {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      return error ? null : data.url;
    },

    // Formas de entrar da pessoa logada (lidas do provedor, nunca do cache).
    signInMethods(): SignInMethodsRepository {
      async function identities() {
        const { data, error } = await supabase.auth.getUserIdentities();
        if (error) throw error;
        return data.identities;
      }
      return {
        async list() {
          const found = await identities();
          return (Object.keys(PROVIDER_BY_METHOD) as SignInMethod[]).filter(
            (method) =>
              found.some((i) => i.provider === PROVIDER_BY_METHOD[method]),
          );
        },
        async unlink(method) {
          const identity = (await identities()).find(
            (i) => i.provider === PROVIDER_BY_METHOD[method],
          );
          if (!identity) return;
          const { error } = await supabase.auth.unlinkIdentity(identity);
          if (error) throw error;
        },
      };
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

// Hora da última entrada na conta, lida do `amr` do JWT ([{ method,
// timestamp }], em segundos). Renovar a sessão não muda essa hora; entrar de
// novo, sim. `null` se o token não traz a hora.
export function signedInAt(claims: JwtClaims): Date | null {
  const { amr } = claims;
  if (!Array.isArray(amr)) return null;
  const seconds = amr
    .map((entry: unknown) =>
      typeof entry === "object" && entry !== null && "timestamp" in entry
        ? entry.timestamp
        : null,
    )
    .filter((value): value is number => typeof value === "number");
  return seconds.length > 0 ? new Date(Math.max(...seconds) * 1000) : null;
}

// Conta no Supabase Auth, com a chave secreta (ignora o RLS): só no
// servidor, e só para o que a chave publishable não faz. Apagar o usuário
// apaga em cascata tudo dele no banco (ADR-003, seção 9).
export function createAccountRepository(): AccountRepository {
  const { url } = supabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY precisa estar definida no servidor.");
  }
  const admin = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (!error) return "deleted";
      if (error.status === 404) return "not_found";
      throw error;
    },
  };
}
