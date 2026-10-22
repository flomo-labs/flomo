import type { LibraryItem } from "./ports";
import type { LibraryStatus } from "./values";

// Ordem das sub-listas da Biblioteca dentro de cada seção (séries e filmes).
export const GROUP_ORDER: readonly LibraryStatus[] = [
  "watching",
  "watchlist",
  "paused",
  "dropped",
  "watched",
];

export type LibraryGroup = { status: LibraryStatus; items: LibraryItem[] };
export type LibrarySections = {
  series: LibraryGroup[];
  movies: LibraryGroup[];
};

function groupByStatus(items: LibraryItem[]): LibraryGroup[] {
  return GROUP_ORDER.map((status) => ({
    status,
    items: items.filter((i) => i.status === status),
  })).filter((g) => g.items.length > 0);
}

// Divide a lista da Biblioteca em séries e filmes e, em cada um, em sub-listas
// por situação. Mantém a ordem dos itens e omite sub-lista vazia.
export function groupLibrary(items: LibraryItem[]): LibrarySections {
  return {
    series: groupByStatus(items.filter((i) => i.mediaType === "tv")),
    movies: groupByStatus(items.filter((i) => i.mediaType === "movie")),
  };
}
