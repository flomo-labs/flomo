// Tipos da prateleira "Em alta no serviço" da Home e o tipo de catálogo de cada um.
export const MEDIA_SEGMENTS = {
  tudo: "all",
  filmes: "movie",
  series: "tv",
  novelas: "novelas",
} as const;
export type MediaSegment = keyof typeof MEDIA_SEGMENTS;
