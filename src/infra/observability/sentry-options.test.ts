import { describe, expect, it } from "vitest";
import { buildSentryOptions, scrubEvent } from "./sentry-options";

describe("buildSentryOptions", () => {
  it("fica desligado sem DSN", () => {
    expect(buildSentryOptions({})).toBeNull();
    expect(buildSentryOptions({ SENTRY_DSN: "   " })).toBeNull();
  });

  it("liga com DSN e nunca envia dados pessoais", () => {
    const options = buildSentryOptions({
      SENTRY_DSN: "https://chave@o0.ingest.sentry.io/1",
      VERCEL_ENV: "preview",
    });
    expect(options).toMatchObject({
      environment: "preview",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: scrubEvent,
    });
  });

  it("usa NODE_ENV quando não há VERCEL_ENV", () => {
    const options = buildSentryOptions({
      SENTRY_DSN: "https://chave@o0.ingest.sentry.io/1",
      NODE_ENV: "production",
    });
    expect(options?.environment).toBe("production");
  });
});

describe("scrubEvent", () => {
  it("remove os parâmetros de consulta do Drizzle", () => {
    const event = scrubEvent({
      message: 'Failed query: select 1\nparams: 7f1c,"maria"',
      exception: {
        values: [{ value: 'Failed query: insert ...\nparams: "maria@x.com"' }],
      },
      request: {
        url: "https://flomo.app/buscar?q=segredo",
        query_string: "q=segredo",
        data: { handle: "maria" },
      },
      logentry: { message: "x\nparams: 1" },
      breadcrumbs: [{ message: "q=segredo" }],
    });
    expect(event.message).toBe("Failed query: select 1");
    expect(event.exception?.values?.[0].value).toBe("Failed query: insert ...");
    expect(event.request).toEqual({ url: "https://flomo.app/buscar" });
    expect(event.logentry?.message).toBe("x");
    expect(event.breadcrumbs).toBeUndefined();
  });

  it("mantém erros sem parâmetros", () => {
    const event = scrubEvent({ message: "boom" });
    expect(event.message).toBe("boom");
  });
});
