// Tipos da prateleira "Em alta no serviço" do Descobrir e o tipo de catálogo de cada um.
export const MEDIA_SEGMENTS = {
  tudo: "all",
  series: "tv",
  filmes: "movie",
  novelas: "novelas",
} as const;
export type MediaSegment = keyof typeof MEDIA_SEGMENTS;
