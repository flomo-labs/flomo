"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { suggestPeople } from "@/app/_people/actions";
import { refsInLibrary } from "@/app/_library/actions";
import { Poster } from "@/components/catalog/poster";
import {
  QuickAddButton,
  type QuickAddLabels,
} from "@/components/catalog/quick-add-button";
import { SearchPersonSuggestion } from "@/components/catalog/search-person-suggestion";
import { Icon } from "@/components/icon";
import { SegmentedControl } from "@/components/segmented-control";
import { Input } from "@/components/ui/input";
import {
  normalizePeopleQuery,
  PEOPLE_SEARCH_MIN_LENGTH,
} from "@/contracts/people-search";
import {
  SEARCH_QUERY_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
  type Suggestion,
} from "@/contracts/catalog";
import { nextSearchHref, searchHref } from "@/lib/search-url";
import { titleRefPath } from "@/lib/title-paths";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

// Filtro do menu de sugestões: títulos (séries e filmes) ou usuários.
type Kind = "titulos" | "pessoas";

type PersonSuggestion = { handle: string; displayName: string | null };

// Textos do filtro do menu. Só quem entrou na conta recebe; sem eles o menu
// mostra só títulos, sem o filtro.
export type SearchPeopleLabels = {
  kindLabel: string;
  kindTitles: string;
  kindPeople: string;
  // Nome da lista de usuários para leitores de tela.
  suggestions: string;
  // "Ver todos os usuários para “{query}”"
  seeAll: string;
  // "Digite pelo menos 3 letras…"
  tooShort: string;
  // “Nenhum usuário encontrado para “{query}”.” e o equivalente para títulos.
  emptyPeople: string;
  emptyTitles: string;
  failed: string;
};

export type SearchComboboxLabels = {
  placeholder: string;
  // Botão "x" que apaga o que foi digitado.
  clear: string;
  // Nome da lista de sugestões para leitores de tela.
  suggestions: string;
  // "Ver todos os resultados para “{query}”"
  seeAll: string;
  movie: string;
  tv: string;
  // Botão "+" de cada sugestão (guardar em "Quero ver").
  quickAdd: QuickAddLabels;
};

// Campo de busca com sugestões: depois de 2 letras e uma pausa, mostra até 5
// títulos (GET /api/sugestoes). Para quem entrou, o menu tem o filtro Séries e
// filmes / Usuários; Usuários pede 3 letras e mostra até 5 contas. Enter sem
// escolher uma sugestão, ou "Ver todos", abre /buscar já no filtro escolhido;
// sem JavaScript o formulário que o contém envia a busca do mesmo jeito. Usado no cabeçalho e na tela de busca. Com texto no campo,
// um "x" à direita apaga tudo e devolve o foco ao campo (o "x" nativo do
// `type="search"` fica escondido).
export function SearchCombobox({
  id,
  defaultValue = "",
  labels,
  required,
  withIcon,
  className,
  listClassName,
  ariaLabel,
  peopleLabels,
  initialKind = "titulos",
}: {
  id?: string;
  defaultValue?: string;
  labels: SearchComboboxLabels;
  required?: boolean;
  withIcon?: boolean;
  className?: string;
  listClassName?: string;
  ariaLabel?: string;
  // Presente só para quem entrou na conta: liga o filtro Usuários.
  peopleLabels?: SearchPeopleLabels;
  // Filtro com que o menu abre (em /buscar, o da aba aberta).
  initialKind?: Kind;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [fetched, setFetched] = useState<{
    query: string;
    items: Suggestion[];
    failed?: boolean;
  }>({ query: "", items: [] });
  const [open, setOpen] = useState(false);
  // Só busca sugestões depois que a pessoa digita: em /buscar?q=… o campo já
  // vem preenchido e a lista não deve abrir sozinha por cima dos resultados.
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(-1);
  const [kind, setKind] = useState<Kind>(
    peopleLabels ? initialKind : "titulos",
  );
  const [fetchedPeople, setFetchedPeople] = useState<{
    term: string;
    items: PersonSuggestion[];
    failed: boolean;
  } | null>(null);
  // Sugestões que já estão na biblioteca ("mediaType-externalId"). Vem de uma
  // consulta para a lista toda, depois das sugestões; sem login fica vazio.
  const [inLibrary, setInLibrary] = useState<ReadonlySet<string>>(new Set());

  const query = value.trim();
  // A resposta guardada só vale enquanto a pessoa continua na mesma busca
  // (acrescentando ou apagando letras). Ao trocar por outra coisa a lista some
  // até chegarem as sugestões novas, em vez de mostrar as da busca anterior.
  const sameSearch =
    query.length >= SUGGESTION_MIN_LENGTH &&
    (query.toLowerCase().startsWith(fetched.query) ||
      fetched.query.startsWith(query.toLowerCase()));
  const titleItems = sameSearch ? fetched.items : [];
  const titlesSettled = sameSearch && fetched.query === query.toLowerCase();

  // Usuários: o termo conta sem o "@" inicial e pede 3 letras, como no banco.
  const personTerm = normalizePeopleQuery(query);
  const peopleTooShort = personTerm.length < PEOPLE_SEARCH_MIN_LENGTH;
  const peopleSettled = fetchedPeople?.term === personTerm;
  const peopleItems = peopleSettled && fetchedPeople ? fetchedPeople.items : [];

  const peopleMode = kind === "pessoas" && Boolean(peopleLabels);
  const people = peopleMode ? peopleItems : [];
  const items = peopleMode ? [] : titleItems;
  const optionCount = peopleMode ? people.length : items.length;
  const seeAllIndex = optionCount;
  const hasOptions = optionCount > 0;
  // Com o filtro, a lista (ao menos "Ver todos") fica visível mesmo sem
  // sugestões, para a busca completa continuar ao alcance do teclado.
  const hasList =
    hasOptions || Boolean(peopleLabels && !(peopleMode && peopleTooShort));
  // Sem o filtro o menu só abre com sugestões; com ele abre depois de digitar,
  // para dar acesso ao filtro Usuários mesmo quando não há título.
  const expanded =
    open &&
    (peopleLabels
      ? typed && query.length >= SUGGESTION_MIN_LENGTH
      : hasOptions);
  const message = !peopleLabels
    ? null
    : peopleMode
      ? peopleTooShort
        ? peopleLabels.tooShort
        : peopleSettled && fetchedPeople?.failed
          ? peopleLabels.failed
          : peopleSettled && people.length === 0
            ? peopleLabels.emptyPeople.replace("{query}", () => personTerm)
            : null
      : titlesSettled && fetched.failed
        ? peopleLabels.failed
        : titlesSettled && items.length === 0
          ? peopleLabels.emptyTitles.replace("{query}", () => query)
          : null;

  useEffect(() => {
    if (!peopleMode || !typed || peopleTooShort) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const result = await suggestPeople({ query: personTerm }).catch(
        () => null,
      );
      if (controller.signal.aborted) return;
      setFetchedPeople({
        term: personTerm,
        items: result?.ok ? result.value.items : [],
        failed: !result?.ok,
      });
      setActive(-1);
      setOpen(true);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [peopleMode, typed, peopleTooShort, personTerm]);

  useEffect(() => {
    if (peopleMode || !typed || query.length < SUGGESTION_MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/sugestoes?${new URLSearchParams({ q: query })}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setFetched({ query: query.toLowerCase(), items: [], failed: true });
          setOpen(true);
          return;
        }
        const body: { items: Suggestion[] } = await response.json();
        setFetched({ query: query.toLowerCase(), items: body.items });
        setActive(-1);
        setOpen(true);
        const owned = await refsInLibrary({
          refs: body.items.map((i) => ({
            mediaType: i.mediaType,
            externalId: i.externalId,
          })),
        });
        if (owned.ok && !controller.signal.aborted) {
          setInLibrary(
            new Set(owned.value.map((r) => `${r.mediaType}-${r.externalId}`)),
          );
        }
      } catch {
        // Cancelada ou sem rede: sem sugestões, a busca normal continua.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, typed, peopleMode]);

  function changeKind(next: Kind) {
    setKind(next);
    setActive(-1);
    setTyped(true);
    setOpen(true);
    input.current?.focus();
  }

  function clear() {
    setValue("");
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }

  function openSearch() {
    setOpen(false);
    // Com o filtro do menu, "Séries e filmes" abre a Buscar em Tudo (o filtro
    // Tudo/Séries/Filmes é da tela de resultados); sem ele, a busca herda a
    // aba e o filtro da URL.
    router.push(
      peopleLabels
        ? searchHref({ query, people: peopleMode })
        : nextSearchHref(query, pathname, searchParams),
    );
  }

  function openSuggestion(index: number) {
    if (index === seeAllIndex) return openSearch();
    setOpen(false);
    router.push(
      peopleMode ? `/@${people[index].handle}` : titleRefPath(items[index]),
    );
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Com o filtro, o Enter abre a busca no filtro escolhido: os campos
    // escondidos do formulário só sabem o da URL.
    if (
      peopleLabels &&
      event.key === "Enter" &&
      !event.nativeEvent.isComposing &&
      (!expanded || active < 0 || !hasList) &&
      query
    ) {
      event.preventDefault();
      return openSearch();
    }
    if (!expanded) return;
    if (event.key === "Escape") {
      // Fecha só a lista; sem isso o campo de busca também limparia o texto.
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!hasList) return;
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
        ref={input}
        id={id}
        name="q"
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && hasList && active >= 0 ? optionId(active) : undefined
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
        className={cn(
          "[&::-webkit-search-cancel-button]:appearance-none",
          value && "pr-10",
          className,
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label={labels.clear}
          title={labels.clear}
          onClick={clear}
          className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:size-10"
        >
          <Icon name="close" className="size-4" />
        </button>
      ) : null}
      <div
        hidden={!expanded}
        // Mantém o foco no campo ao clicar numa sugestão ou no filtro.
        onMouseDown={(event) => event.preventDefault()}
        className={cn(
          "absolute top-full z-50 mt-2 w-full min-w-0 sm:min-w-72 overflow-hidden rounded-card border border-border bg-popover p-1.5 text-popover-foreground shadow-lg",
          listClassName,
        )}
      >
        {peopleLabels ? (
          <div className="flex overflow-x-auto px-1 pt-0.5 pb-1.5">
            <SegmentedControl
              value={kind}
              ariaLabel={peopleLabels.kindLabel}
              options={[
                { value: "titulos", label: peopleLabels.kindTitles },
                { value: "pessoas", label: peopleLabels.kindPeople },
              ]}
              onChange={changeKind}
            />
          </div>
        ) : null}
        {message ? (
          <p
            role="status"
            className="px-2.5 py-2 text-sm text-muted-foreground"
          >
            {message}
          </p>
        ) : null}
        <ul
          id={listId}
          role="listbox"
          aria-label={
            peopleMode && peopleLabels
              ? peopleLabels.suggestions
              : labels.suggestions
          }
          hidden={!hasList}
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
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-semibold break-words">
                  {item.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.mediaType === "movie" ? labels.movie : labels.tv}
                  {item.year ? ` · ${item.year}` : ""}
                </div>
              </div>
              <QuickAddButton
                target={{
                  mediaType: item.mediaType,
                  externalId: item.externalId,
                }}
                title={item.title}
                inLibrary={inLibrary.has(
                  `${item.mediaType}-${item.externalId}`,
                )}
                labels={labels.quickAdd}
                className="mr-1 shrink-0"
              />
            </li>
          ))}
          {people.map((person, index) => (
            <li
              key={person.handle}
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
              <SearchPersonSuggestion
                handle={person.handle}
                displayName={person.displayName}
              />
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
            {(peopleMode && peopleLabels
              ? peopleLabels.seeAll
              : labels.seeAll
            ).replace("{query}", () => (peopleMode ? personTerm : query))}
          </li>
        </ul>
      </div>
    </div>
  );
}
