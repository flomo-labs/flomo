// Tipos do filtro do Descobrir e o tipo de catálogo de cada um. Todos, séries
// e filmes sempre existem; novelas e animes só onde o serviço tiver títulos.
export const MEDIA_SEGMENTS = {
  tudo: "all",
  series: "tv",
  filmes: "movie",
  novelas: "novelas",
  animes: "animes",
} as const;
export type MediaSegment = keyof typeof MEDIA_SEGMENTS;
export const BASE_SEGMENTS = ["tudo", "series", "filmes"] as const;
