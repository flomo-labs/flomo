// Visões da Biblioteca: por situação (a padrão), pôsteres, lista e ocultos.
export const LIBRARY_VIEWS = ["grouped", "posters", "list", "hidden"] as const;
export type LibraryView = (typeof LIBRARY_VIEWS)[number];

// Recorte por tipo: tudo, só séries ou só filmes. Cada um tem a sua rota.
export const LIBRARY_TYPES = ["all", "tv", "movie"] as const;
export type LibraryType = (typeof LIBRARY_TYPES)[number];

export const LIBRARY_TYPE_PATH: Record<LibraryType, string> = {
  all: "/biblioteca",
  tv: "/biblioteca/series",
  movie: "/biblioteca/filmes",
};
