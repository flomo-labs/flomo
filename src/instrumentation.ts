import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { buildSentryOptions } from "@/infra/observability/sentry-options";

// Roda uma vez por instância do servidor (Node e Edge). Só erros do servidor
// são enviados; o navegador não carrega o Sentry.
export function register() {
  const options = buildSentryOptions(process.env);
  if (options) Sentry.init(options);
}

// Erros de renderização, Server Actions e rotas.
export const onRequestError: Instrumentation.onRequestError = (...args) => {
  Sentry.captureRequestError(...args);
};
