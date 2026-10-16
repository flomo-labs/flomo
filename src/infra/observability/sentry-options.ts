// Configuração do Sentry (erros do servidor). Sem DSN, o Sentry fica desligado:
// é o caso do desenvolvimento local, dos testes e de qualquer ambiente em que
// a variável não foi definida.
export type SentryOptions = {
  dsn: string;
  environment: string;
  sendDefaultPii: false;
  tracesSampleRate: 0;
};

export function buildSentryOptions(
  env: Record<string, string | undefined>,
): SentryOptions | null {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return null;

  return {
    dsn,
    // Vercel define VERCEL_ENV (production | preview | development).
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? "development",
    // Sem IP, cookies nem cabeçalhos do usuário: a política de privacidade
    // só promete o que está aqui. Sem tracing, replay nem logs.
    sendDefaultPii: false,
    tracesSampleRate: 0,
  };
}
