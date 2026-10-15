import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl", () => {
  it("usa NEXT_PUBLIC_SITE_URL fora de preview", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://flomo.example" }),
    ).toBe("https://flomo.example");
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "production",
        VERCEL_URL: "x.vercel.app",
        NEXT_PUBLIC_SITE_URL: "https://flomo.example",
      }),
    ).toBe("https://flomo.example");
  });

  it("usa o endereço do deploy em preview", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "flomo-git-x.vercel.app",
        NEXT_PUBLIC_SITE_URL: "https://flomo.example",
      }),
    ).toBe("https://flomo-git-x.vercel.app");
  });

  it("devolve undefined sem nenhuma das duas", () => {
    expect(resolveSiteUrl({})).toBeUndefined();
  });
});
