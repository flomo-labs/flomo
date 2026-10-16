import { describe, expect, it } from "vitest";
import { buildSentryOptions } from "./sentry-options";

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
