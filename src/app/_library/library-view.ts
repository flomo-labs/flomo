// Visões da Biblioteca: por situação (a padrão), pôsteres, lista e ocultos.
export const LIBRARY_VIEWS = ["grouped", "posters", "list", "hidden"] as const;
export type LibraryView = (typeof LIBRARY_VIEWS)[number];
