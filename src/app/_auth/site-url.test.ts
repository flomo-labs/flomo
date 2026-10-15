import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site-url";

const fixed = "https://flomo.example";

describe("resolveSiteUrl", () => {
  it("usa NEXT_PUBLIC_SITE_URL fora de preview, mesmo com host", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: fixed })).toBe(fixed);
    expect(
      resolveSiteUrl(
        { VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: fixed },
        "outro.vercel.app",
      ),
    ).toBe(fixed);
    expect(
      resolveSiteUrl(
        { VERCEL_ENV: "development", NEXT_PUBLIC_SITE_URL: fixed },
        "localhost:3000",
      ),
    ).toBe(fixed);
  });

  it("usa o host da requisição em preview", () => {
    expect(
      resolveSiteUrl(
        { VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: fixed },
        "flomo-git-x.vercel.app",
      ),
    ).toBe("https://flomo-git-x.vercel.app");
  });

  it("em preview sem host cai na variável fixa", () => {
    expect(
      resolveSiteUrl({ VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: fixed }),
    ).toBe(fixed);
  });

  it("trata variável vazia ou ausente como indefinida", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "" })).toBeUndefined();
    expect(resolveSiteUrl({})).toBeUndefined();
  });
});
