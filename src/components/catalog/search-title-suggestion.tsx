import { Poster } from "@/components/catalog/poster";

// Conteúdo de um título no menu da busca (sugestões e buscas recentes):
// pôster, título e "tipo · ano". A linha (`li`, clique e destaque) é do
// `SearchCombobox`.
export function SearchTitleSuggestion({
  title,
  posterPath,
  kindLabel,
  year,
}: {
  title: string;
  posterPath: string | null;
  // "Série" ou "Filme".
  kindLabel: string;
  year: string | null;
}) {
  return (
    <>
      <Poster
        path={posterPath}
        size="w92"
        alt=""
        className="w-8 shrink-0 sm:w-10"
      />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-semibold break-words">
          {title}
        </div>
        <div className="text-xs text-muted-foreground">
          {kindLabel}
          {year ? ` · ${year}` : ""}
        </div>
      </div>
    </>
  );
}
