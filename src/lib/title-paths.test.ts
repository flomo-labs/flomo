import { describe, expect, it } from "vitest";
import { mediaTypeFromSegment, titleRefPath } from "./title-paths";

describe("title-paths", () => {
  it("monta e lê o caminho da referência", () => {
    expect(titleRefPath({ mediaType: "movie", externalId: "603" })).toBe(
      "/titulo/ref/filme/603",
    );
    expect(titleRefPath({ mediaType: "tv", externalId: "1396" })).toBe(
      "/titulo/ref/serie/1396",
    );
    expect(mediaTypeFromSegment("filme")).toBe("movie");
    expect(mediaTypeFromSegment("serie")).toBe("tv");
    expect(mediaTypeFromSegment("movie")).toBeNull();
    expect(mediaTypeFromSegment("constructor")).toBeNull();
  });
});
