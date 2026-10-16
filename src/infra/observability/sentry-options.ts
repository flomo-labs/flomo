// Configuração do Sentry (erros do servidor). Sem DSN, o Sentry fica desligado:
// é o caso do desenvolvimento local, dos testes e de qualquer ambiente em que
// a variável não foi definida.
type ScrubbableEvent = {
  message?: string;
  logentry?: { message?: string };
  breadcrumbs?: unknown;
  exception?: { values?: { value?: string }[] };
  request?: { url?: string; query_string?: unknown; data?: unknown };
};

// Erros de consulta do Drizzle trazem os valores ligados à consulta
// ("Failed query: ...\nparams: <valores>"), que incluem id do usuário, handle
// e o que ele digitou. Tudo a partir de "params:" é cortado antes do envio.
const PARAMS_FROM = /\r?\nparams:[\s\S]*$/;

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.message) event.message = event.message.replace(PARAMS_FROM, "");
  if (event.logentry?.message) {
    event.logentry.message = event.logentry.message.replace(PARAMS_FROM, "");
  }
  // Rastros (console, fetch com query string) podem repetir o que o usuário digitou.
  delete event.breadcrumbs;
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) {
      exception.value = exception.value.replace(PARAMS_FROM, "");
    }
  }
  if (event.request) {
    delete event.request.query_string;
    delete event.request.data;
    // A URL também carrega a busca ("/buscar?q=..."): fica só o caminho.
    if (event.request.url)
      event.request.url = event.request.url.split(/[?#]/)[0];
  }
  return event;
}

export type SentryOptions = {
  dsn: string;
  environment: string;
  sendDefaultPii: false;
  tracesSampleRate: 0;
  beforeSend: typeof scrubEvent;
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
    beforeSend: scrubEvent,
  };
}
