import type { LibraryItem } from "./ports";

// Quantos títulos de cada tipo a prévia do perfil mostra.
export const PREVIEW_SIZE = 6;

export type LibraryPreview = { series: LibraryItem[]; movies: LibraryItem[] };
