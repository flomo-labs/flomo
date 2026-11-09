import { describe, expect, it } from "vitest";
import { resolveMetadataBase, sharePreview } from "./share-preview";

describe("resolveMetadataBase", () => {
  it("usa NEXT_PUBLIC_SITE_URL quando definida", () => {
    expect(
      resolveMetadataBase({
        NEXT_PUBLIC_SITE_URL: "https://www.flomo.com.br",
        VERCEL_URL: "x.vercel.app",
      }).origin,
    ).toBe("https://www.flomo.com.br");
  });
  it("em preview usa o endereço do deploy", () => {
    expect(resolveMetadataBase({ VERCEL_URL: "x.vercel.app" }).origin).toBe(
      "https://x.vercel.app",
    );
  });
  it("cai em localhost sem variáveis", () => {
    expect(resolveMetadataBase({}).origin).toBe("http://localhost:3000");
  });
});

describe("sharePreview", () => {
  it("usa a imagem da marca em formato grande por padrão", () => {
    const m = sharePreview({ title: "Flomo", description: "d" });
    expect(m.openGraph?.images).toEqual([
      { url: "/og-flomo.png", width: 1200, height: 630, alt: "Flomo" },
    ]);
    expect((m.twitter as { card?: string }).card).toBe("summary_large_image");
  });
  it("usa a imagem própria quando informada", () => {
    const m = sharePreview({
      title: "T",
      description: "d",
      image: { url: "https://image.tmdb.org/t/p/w780/a.jpg", alt: "T" },
    });
    expect(m.openGraph?.images).toEqual([
      { url: "https://image.tmdb.org/t/p/w780/a.jpg", alt: "T" },
    ]);
    expect((m.twitter as { card?: string }).card).toBe("summary");
  });
});
