import type { CatalogRef, MediaType } from "@/domain/catalog/types";

// URLs públicas em português: /titulo/ref/filme/603. A rota de referência
// existe para abrir um resultado de busca que ainda não tem uuid do Flomo.
const SEGMENT_BY_TYPE: Record<MediaType, string> = {
  movie: "filme",
  tv: "serie",
};

export function titleRefPath(ref: CatalogRef): string {
  return `/titulo/ref/${SEGMENT_BY_TYPE[ref.mediaType]}/${ref.externalId}`;
}

export function mediaTypeFromSegment(segment: string): MediaType | null {
  const entry = Object.entries(SEGMENT_BY_TYPE).find(([, s]) => s === segment);
  return entry ? (entry[0] as MediaType) : null;
}
