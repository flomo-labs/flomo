import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Uma seção do menu de sugestões da busca (Séries e filmes, Usuários): título,
// "Ver tudo ›" à direita, aviso opcional e a lista de opções (`li` do
// `SearchCombobox`, que cuida de clique, destaque e teclado).
export function SearchSuggestionSection({
  heading,
  seeAllLabel,
  seeAllAriaLabel,
  onSeeAll,
  message,
  listId,
  listLabel,
  empty,
  children,
  className,
}: {
  heading: string;
  seeAllLabel: string;
  seeAllAriaLabel: string;
  // Sem a função, o "Ver tudo" não aparece.
  onSeeAll?: () => void;
  message: string | null;
  listId: string;
  listLabel: string;
  // Lista sem opções: fica escondida (só o título e o aviso aparecem).
  empty: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("[&+&]:mt-1", className)}>
      <div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-1">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {heading}
        </h3>
        {onSeeAll ? (
          <button
            type="button"
            aria-label={seeAllAriaLabel}
            onClick={onSeeAll}
            className="cursor-pointer rounded-full px-1.5 py-0.5 text-xs text-sidebar-primary outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:py-2.5"
          >
            {seeAllLabel} <span aria-hidden="true">›</span>
          </button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="px-2.5 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <ul id={listId} role="listbox" aria-label={listLabel} hidden={empty}>
        {children}
      </ul>
    </section>
  );
}
