import { Poster } from "@/components/catalog/poster";
import { SearchPersonSuggestion } from "@/components/catalog/search-person-suggestion";
import { Icon } from "@/components/icon";
import type { RecentSearch } from "@/lib/recent-searches";

// Conteúdo de uma recente no menu da busca (#414) e um "×" que remove só esse
// item. Termo buscado: relógio e o termo. Sugestão aceita: igual à sugestão
// (pôster, título e tipo · ano; ou foto, nome e @usuário). O `li` (clique,
// destaque, teclado) é do `SearchCombobox`; o clique no "×" não abre o item.
export function SearchRecentItem({
  item,
  labels,
  removeLabel,
  onRemove,
}: {
  item: RecentSearch;
  labels: { movie: string; tv: string };
  // Nome acessível do "×" ("Remover “dark” das buscas recentes").
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <>
      {item.kind === "query" ? (
        <>
          <Icon
            name="time"
            className="ml-1 size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1 truncate text-sm">{item.term}</span>
        </>
      ) : item.kind === "title" ? (
        <>
          <Poster
            path={item.posterPath}
            size="w92"
            alt=""
            className="w-8 shrink-0 sm:w-10"
          />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-semibold break-words">
              {item.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {item.mediaType === "movie" ? labels.movie : labels.tv}
              {item.year ? ` · ${item.year}` : ""}
            </div>
          </div>
        </>
      ) : (
        <SearchPersonSuggestion
          handle={item.handle}
          displayName={item.displayName}
        />
      )}
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:size-11"
      >
        <Icon name="close" className="size-4" />
      </button>
    </>
  );
}
