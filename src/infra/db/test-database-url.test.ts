import { describe, expect, it } from "vitest";
import { resolveTestDatabaseUrl } from "./test-database-url";

const dev =
  "postgres://postgres.devref:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

describe("resolveTestDatabaseUrl", () => {
  it("devolve a URL de teste quando tudo está certo", () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL_TEST: dev })).toBe(dev);
  });

  it("exige DATABASE_URL_TEST e não cai no DATABASE_URL", () => {
    expect(() => resolveTestDatabaseUrl({ DATABASE_URL: dev })).toThrow(
      /DATABASE_URL_TEST não definida/,
    );
  });

  it("recusa ambiente de produção", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        DATABASE_URL_TEST: dev,
        VERCEL_ENV: "production",
      }),
    ).toThrow(/produção/);
    expect(() =>
      resolveTestDatabaseUrl({
        DATABASE_URL_TEST: dev,
        NODE_ENV: "production",
      }),
    ).toThrow(/produção/);
  });

  it("recusa URL inválida", () => {
    expect(() => resolveTestDatabaseUrl({ DATABASE_URL_TEST: "nada" })).toThrow(
      /URL válida/,
    );
  });

  it("recusa o ref de produção, no usuário do pooler ou no host", () => {
    const env = { FLOMO_PROD_DB_REF: "prodref" };
    expect(() =>
      resolveTestDatabaseUrl({
        ...env,
        DATABASE_URL_TEST: dev.replace("devref", "prodref"),
      }),
    ).toThrow(/produção/);
    expect(() =>
      resolveTestDatabaseUrl({
        ...env,
        DATABASE_URL_TEST:
          "postgres://postgres:s@db.prodref.supabase.co:5432/postgres",
      }),
    ).toThrow(/produção/);
    expect(resolveTestDatabaseUrl({ ...env, DATABASE_URL_TEST: dev })).toBe(
      dev,
    );
  });
});
