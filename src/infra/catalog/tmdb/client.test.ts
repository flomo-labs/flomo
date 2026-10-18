import { describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError } from "@/domain/catalog/ports";
import { createTmdbClient, retryDelayMs } from "./client";

const V3_KEY = "0123456789abcdef0123456789abcdef";
const V4_TOKEN = "eyJhbGciOiJIUzI1NiJ9.e30.assinatura";

function json(status: number, body: unknown = {}, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

function setup(responses: Response[], credential = V4_TOKEN) {
  const fetch = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    void input;
    void init;
    const next = responses.shift();
    if (!next) throw new Error("sem resposta preparada");
    return next;
  });
  const sleep = vi.fn(async () => {});
  const client = createTmdbClient({ credential, fetch, sleep });
  return { client, fetch, sleep };
}

describe("createTmdbClient", () => {
  it("com o token de leitura, envia Bearer e não põe a chave na URL", async () => {
    const { client, fetch } = setup([json(200, { ok: 1 })]);
    await expect(
      client.get("search/multi", { query: "dark", page: 1 }),
    ).resolves.toEqual({ ok: 1 });

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.themoviedb.org/3/search/multi?query=dark&page=1",
    );
    expect((init?.headers as Record<string, string>).authorization).toBe(
      `Bearer ${V4_TOKEN}`,
    );
  });

  it("com a chave v3, envia api_key", async () => {
    const { client, fetch } = setup([json(200)], V3_KEY);
    await client.get("movie/603");
    const [url, init] = fetch.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("api_key")).toBe(V3_KEY);
    expect(
      (init?.headers as Record<string, string>).authorization,
    ).toBeUndefined();
  });

  it("aceita outra URL base (TMDB falso do E2E)", async () => {
    const fetch = vi.fn(async (input: URL | RequestInfo) => {
      void input;
      return json(200);
    });
    const client = createTmdbClient({
      credential: V4_TOKEN,
      baseUrl: "http://localhost:3999/3/",
      fetch,
    });
    await client.get("tv/1", { language: "pt-BR" });
    expect(String(fetch.mock.calls[0][0])).toBe(
      "http://localhost:3999/3/tv/1?language=pt-BR",
    );
  });

  it("404 vira null", async () => {
    const { client } = setup([json(404)]);
    await expect(client.get("movie/1")).resolves.toBeNull();
  });

  it("429: espera o Retry-After e tenta de novo", async () => {
    const { client, fetch, sleep } = setup([
      json(429, {}, { "retry-after": "2" }),
      json(429),
      json(200, { ok: 1 }),
    ]);
    await expect(client.get("movie/603")).resolves.toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[2000], [2000]]);
  });

  it("429 depois de 3 novas tentativas: indisponível", async () => {
    const { client, fetch } = setup([
      json(429),
      json(429),
      json(429),
      json(429),
    ]);
    await expect(client.get("movie/603")).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("desiste quando as esperas somadas passam do prazo total", async () => {
    const { client, fetch, sleep } = setup([
      json(429, {}, { "retry-after": "10" }),
      json(429, {}, { "retry-after": "10" }),
    ]);
    await expect(client.get("movie/603")).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls).toEqual([[10_000]]);
  });

  it("lê o corpo dentro da vaga do limitador", async () => {
    let active = 0;
    let peak = 0;
    const fetch = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      return {
        status: 200,
        ok: true,
        json: async () => {
          await new Promise((r) => setTimeout(r, 5));
          active--;
          return {};
        },
      } as unknown as Response;
    });
    const client = createTmdbClient({
      credential: V4_TOKEN,
      fetch,
      maxConcurrent: 2,
    });
    await Promise.all([1, 2, 3, 4, 5].map((n) => client.get(`movie/${n}`)));
    expect(peak).toBe(2);
  });

  it("erros não expõem a chave", async () => {
    for (const response of [json(401), json(500)]) {
      const { client } = setup([response], V3_KEY);
      const error = await client.get("movie/603").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(CatalogUnavailableError);
      expect(String((error as Error).message)).not.toContain(V3_KEY);
    }
    const failing = createTmdbClient({
      credential: V3_KEY,
      fetch: vi.fn(async () => {
        throw new TypeError(`fetch failed ?api_key=${V3_KEY}`);
      }),
    });
    const error = await failing.get("movie/603").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CatalogUnavailableError);
    expect(JSON.stringify(error)).not.toContain(V3_KEY);
    expect((error as Error).message).not.toContain(V3_KEY);
    expect((error as Error).cause).toBeUndefined();
  });

  it("exige a chave", () => {
    expect(() => createTmdbClient({ credential: "" })).toThrow(
      /TMDB_READ_ACCESS_TOKEN ou TMDB_API_KEY/,
    );
  });
});

describe("retryDelayMs", () => {
  it("usa segundos, data HTTP ou espera exponencial, com teto de 10 s", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    expect(retryDelayMs("3", 0, now)).toBe(3000);
    expect(retryDelayMs("Thu, 15 Oct 2026 12:00:05 GMT", 0, now)).toBe(5000);
    expect(retryDelayMs(null, 0, now)).toBe(1000);
    expect(retryDelayMs(null, 2, now)).toBe(4000);
    expect(retryDelayMs("600", 0, now)).toBe(10_000);
  });
});
