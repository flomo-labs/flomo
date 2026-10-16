// URLs das imagens no CDN do TMDB (Plano v2, decisão 17). O banco guarda só
// o caminho (`/abc.jpg`); o tamanho é escolhido por quem exibe.
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type TmdbImageSize =
  | "w92"
  | "w154"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "w1280"
  | "original";

export function tmdbImageUrl(
  path: string | null,
  size: TmdbImageSize,
): string | null {
  if (!path || !/^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|svg|webp)$/.test(path)) {
    return null;
  }
  return `${IMAGE_BASE_URL}/${size}${path}`;
}
