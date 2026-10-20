"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Poster } from "@/components/catalog/poster";
import { Icon } from "@/components/icon";
import { Input } from "@/components/ui/input";
import {
  SEARCH_QUERY_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
  type Suggestion,
} from "@/contracts/catalog";
import { titleRefPath } from "@/lib/title-paths";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

export type SearchComboboxLabels = {
  placeholder: string;
  // Nome da lista de sugestões para leitores de tela.
  suggestions: string;
  // "Ver todos os resultados para “{query}”"
  seeAll: string;
  movie: string;
  tv: string;
};

// Campo de busca com sugestões: depois de 2 letras e uma pausa, mostra até 5
// títulos (GET /api/sugestoes). Enter sem escolher uma sugestão, ou "Ver
// todos", abre /buscar; sem JavaScript o formulário que o contém envia a busca
// do mesmo jeito. Usado no cabeçalho e na tela de busca.
export function SearchCombobox({
  id,
  defaultValue = "",
  labels,
  required,
  withIcon,
  className,
  listClassName,
  ariaLabel,
}: {
  id?: string;
  defaultValue?: string;
  labels: SearchComboboxLabels;
  required?: boolean;
  withIcon?: boolean;
  className?: string;
  listClassName?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [fetched, setFetched] = useState<{
    query: string;
    items: Suggestion[];
  }>({ query: "", items: [] });
  const [open, setOpen] = useState(false);
  // Só busca sugestões depois que a pessoa digita: em /buscar?q=… o campo já
  // vem preenchido e a lista não deve abrir sozinha por cima dos resultados.
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim();
  // A resposta guardada só vale enquanto a pessoa continua na mesma busca
  // (acrescentando ou apagando letras). Ao trocar por outra coisa a lista some
  // até chegarem as sugestões novas, em vez de mostrar as da busca anterior.
  const sameSearch =
    query.length >= SUGGESTION_MIN_LENGTH &&
    (query.toLowerCase().startsWith(fetched.query) ||
      fetched.query.startsWith(query.toLowerCase()));
  const items = sameSearch ? fetched.items : [];
  const seeAllIndex = items.length;
  const expanded = open && items.length > 0;

  useEffect(() => {
    if (!typed || query.length < SUGGESTION_MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/sugestoes?${new URLSearchParams({ q: query })}`,
          { signal: controller.signal },
        );
        if (!response.ok) return setFetched({ query: "", items: [] });
        const body: { items: Suggestion[] } = await response.json();
        setFetched({ query: query.toLowerCase(), items: body.items });
        setActive(-1);
        setOpen(true);
      } catch {
        // Cancelada ou sem rede: sem sugestões, a busca normal continua.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, typed]);

  function openSearch() {
    setOpen(false);
    router.push(`/buscar?${new URLSearchParams({ q: query })}`);
  }

  function openSuggestion(index: number) {
    if (index === seeAllIndex) return openSearch();
    setOpen(false);
    router.push(titleRefPath(items[index]));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!expanded) return;
    if (event.key === "Escape") {
      // Fecha só a lista; sem isso o campo de busca também limparia o texto.
      event.preventDefault();
      setOpen(false);
      return;
    }
    const last = seeAllIndex;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current >= last ? 0 : current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current <= 0 ? last : current - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      openSuggestion(active);
    }
  }

  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <div
      ref={root}
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {withIcon ? (
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
      ) : null}
      <Input
        id={id}
        name="q"
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && active >= 0 ? optionId(active) : undefined
        }
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setTyped(true);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={labels.placeholder}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        autoComplete="off"
        required={required}
        className={className}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={labels.suggestions}
        hidden={!expanded}
        // Mantém o foco no campo ao clicar numa sugestão.
        onMouseDown={(event) => event.preventDefault()}
        className={cn(
          "absolute top-full z-50 mt-2 w-full min-w-72 overflow-hidden rounded-card border border-border bg-popover p-1.5 text-popover-foreground shadow-lg",
          listClassName,
        )}
      >
        {items.map((item, index) => (
          <li
            key={`${item.mediaType}-${item.externalId}`}
            id={optionId(index)}
            role="option"
            aria-selected={active === index}
            onMouseEnter={() => setActive(index)}
            onClick={() => openSuggestion(index)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl p-1.5",
              active === index && "bg-muted",
            )}
          >
            <Poster
              path={item.posterPath}
              size="w92"
              alt=""
              className="w-8 shrink-0 sm:w-10"
            />
            <div className="min-w-0">
              <div className="line-clamp-1 text-sm font-semibold">
                {item.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.mediaType === "movie" ? labels.movie : labels.tv}
                {item.year ? ` · ${item.year}` : ""}
              </div>
            </div>
          </li>
        ))}
        <li role="presentation" className="my-1 h-px bg-border" />
        <li
          id={optionId(seeAllIndex)}
          role="option"
          aria-selected={active === seeAllIndex}
          onMouseEnter={() => setActive(seeAllIndex)}
          onClick={openSearch}
          className={cn(
            "cursor-pointer truncate rounded-xl px-2.5 py-2 text-sm text-sidebar-primary",
            active === seeAllIndex && "bg-muted",
          )}
        >
          {labels.seeAll.replace("{query}", () => query)}
        </li>
      </ul>
    </div>
  );
}
