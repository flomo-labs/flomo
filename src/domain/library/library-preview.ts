import type { LibraryItem } from "./ports";

export const PREVIEW_SIZE = 6;

export type LibraryPreview = { series: LibraryItem[]; movies: LibraryItem[] };

// Prévia da biblioteca para o perfil: os primeiros títulos de cada tipo, na
// ordem em que a lista já chega (situação mudada mais recentemente primeiro).
export function libraryPreview(
  items: LibraryItem[],
  perType: number = PREVIEW_SIZE,
): LibraryPreview {
  return {
    series: items.filter((i) => i.mediaType === "tv").slice(0, perType),
    movies: items.filter((i) => i.mediaType === "movie").slice(0, perType),
  };
}
