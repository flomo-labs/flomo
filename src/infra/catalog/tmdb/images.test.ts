import { describe, expect, it } from "vitest";
import { tmdbImageUrl } from "./images";

describe("tmdbImageUrl", () => {
  it("monta a URL do CDN", () => {
    expect(tmdbImageUrl("/abc_D-1.jpg", "w342")).toBe(
      "https://image.tmdb.org/t/p/w342/abc_D-1.jpg",
    );
  });

  it("ignora caminho vazio ou estranho", () => {
    expect(tmdbImageUrl(null, "w342")).toBeNull();
    expect(tmdbImageUrl("", "w342")).toBeNull();
    expect(tmdbImageUrl("//evil.example/x.jpg", "w342")).toBeNull();
    expect(tmdbImageUrl("/../x.jpg", "w342")).toBeNull();
  });
});
