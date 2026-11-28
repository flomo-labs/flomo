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
import { SearchRecentItem } from "@/components/catalog/search-recent-item";
import { SearchSuggestionSection } from "@/components/catalog/search-suggestion-section";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
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
import {
  addRecentSearch,
  loadRecentSearches,
  type RecentSearch,
  recentKey,
  recentName,
  removeRecentSearch,
  saveRecentSearches,
} from "@/lib/recent-searches";
import { nextSearchHref, searchHref } from "@/lib/search-url";
import { titleRefPath } from "@/lib/title-paths";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

type PersonSuggestion = { handle: string; displayName: string | null };

// Textos da seção Usuários do menu. Só quem entrou na conta recebe; sem eles o
// menu mostra só a seção de títulos.
export type SearchPeopleLabels = {
  // Título da seção ("Usuários").
  heading: string;
  // Nome da lista de usuários para leitores de tela.
  suggestions: string;
  // "Ver tudo em Usuários para “{query}”" (nome acessível do "Ver tudo").
  seeAll: string;
  // "Digite pelo menos 3 letras…"
  tooShort: string;
  // “Nenhum usuário encontrado para “{query}”.” e o equivalente para títulos.
  emptyPeople: string;
  emptyTitles: string;
  failed: string;
};

// Textos do modo tela cheia do celular.
export type SearchMobileScreenLabels = {
  // Botão X à direita do campo: fecha a tela e apaga a busca.
  close: string;
};

// Textos das buscas recentes (campo vazio). Sem eles o recurso fica desligado.
export type SearchRecentLabels = {
  // Título da seção ("Buscas recentes") e nome da lista para leitores de tela.
  heading: string;
  // Botão que apaga todas ("Limpar") e seu nome acessível.
  clear: string;
  clearAria: string;
  // "Remover “{term}” das buscas recentes" (nome acessível do "×" de cada item).
  remove: string;
};

export type SearchComboboxLabels = {
  placeholder: string;
  // Botão "x" que apaga o que foi digitado.
  clear: string;
  // Nome da lista de sugestões para leitores de tela.
  suggestions: string;
  // Título da seção de títulos ("Séries e filmes").
  titlesHeading: string;
  // Texto visível do "Ver tudo" de cada seção.
  seeAllShort: string;
  // "Ver tudo em Séries e filmes para “{query}”" (nome acessível).
  seeAll: string;
  movie: string;
  tv: string;
  // Botão "+" de cada sugestão (guardar em "Quero ver").
  quickAdd: QuickAddLabels;
};

// Campo de busca com sugestões: depois de 2 letras e uma pausa, mostra até 5
// títulos (GET /api/sugestoes). Para quem entrou, o menu tem duas seções ao
// mesmo tempo, Séries e filmes e Usuários (3 letras, até 5 contas), cada uma com
// "Ver tudo ›" que abre /buscar na aba correspondente. Enter sem escolher uma
// sugestão abre /buscar em Séries e filmes; sem JavaScript o formulário que o
// contém envia a busca do mesmo jeito. Usado no cabeçalho e na tela de busca.
// Com texto no campo, um "x" à direita apaga tudo e devolve o foco ao campo (o
// "x" nativo do `type="search"` fica escondido).
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
  mobileScreen,
  recentLabels,
}: {
  id?: string;
  defaultValue?: string;
  labels: SearchComboboxLabels;
  required?: boolean;
  withIcon?: boolean;
  className?: string;
  listClassName?: string;
  ariaLabel?: string;
  // Presente só para quem entrou na conta: liga a seção Usuários.
  peopleLabels?: SearchPeopleLabels;
  // Só no celular (abaixo de md): ao tocar no campo a busca ocupa a tela, com
  // um X à direita do campo, e as sugestões viram a lista da própria
  // tela, que rola sozinha, em vez de um menu sobre a página (#413).
  mobileScreen?: SearchMobileScreenLabels;
  // Liga as buscas recentes (#414): com o campo vazio o menu lista as últimas
  // buscas guardadas neste aparelho.
  recentLabels?: SearchRecentLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [fetched, setFetched] = useState<{
    query: string;
    items: Suggestion[];
    failed?: boolean;
  }>({ query: "", items: [] });
  // As respostas das sugestões só abrem o menu se o campo ainda está em uso:
  // ao voltar de outra tela a busca é refeita e não deve reabrir o menu antigo.
  const [open, setOpen] = useState(false);
  // Modo tela cheia do celular ligado (só com `mobileScreen`).
  const [engaged, setEngaged] = useState(false);
  const screen = Boolean(mobileScreen) && engaged;
  // Só busca sugestões depois que a pessoa digita: em /buscar?q=… o campo já
  // vem preenchido e a lista não deve abrir sozinha por cima dos resultados.
  const [typed, setTyped] = useState(false);
  const [activeRaw, setActive] = useState(-1);
  const [fetchedPeople, setFetchedPeople] = useState<{
    term: string;
    items: PersonSuggestion[];
    failed: boolean;
  } | null>(null);
  // Sugestões que já estão na biblioteca ("mediaType-externalId"). Vem de uma
  // consulta para a lista toda, depois das sugestões; sem login fica vazio.
  const [inLibrary, setInLibrary] = useState<ReadonlySet<string>>(new Set());
  // Buscas recentes deste aparelho. Lidas ao focar o campo (e não na
  // montagem) para o servidor e o navegador renderizarem o mesmo HTML e para
  // valer o que outra aba ou o outro campo da página guardou.
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  const query = value.trim();
  // A resposta guardada só vale enquanto a pessoa continua na mesma busca
  // (acrescentando ou apagando letras). Ao trocar por outra coisa a lista some
  // até chegarem as sugestões novas, em vez de mostrar as da busca anterior.
  const sameSearch =
    query.length >= SUGGESTION_MIN_LENGTH &&
    (query.toLowerCase().startsWith(fetched.query) ||
      fetched.query.startsWith(query.toLowerCase()));
  const items = sameSearch ? fetched.items : [];
  const titlesSettled = sameSearch && fetched.query === query.toLowerCase();

  // Usuários: o termo conta sem o "@" inicial e pede 3 letras, como no banco.
  const personTerm = normalizePeopleQuery(query);
  const peopleTooShort = personTerm.length < PEOPLE_SEARCH_MIN_LENGTH;
  const peopleSettled = fetchedPeople?.term === personTerm;
  const people =
    peopleLabels && !peopleTooShort && peopleSettled && fetchedPeople
      ? fetchedPeople.items
      : [];

  // Campo vazio: o menu mostra as buscas recentes no lugar das sugestões.
  const showRecent =
    Boolean(recentLabels) && query === "" && recents.length > 0;

  // Opções navegáveis por setas: títulos e depois usuários, numa lista só (ou
  // as buscas recentes, com o campo vazio).
  const optionCount = showRecent
    ? recents.length
    : items.length + people.length;
  const hasOptions = optionCount > 0;
  // O destaque some se a lista encolheu por baixo dele (ex.: os usuários
  // sumiram enquanto a pessoa continua digitando).
  const active = activeRaw < optionCount ? activeRaw : -1;
  // Sem a seção Usuários o menu só abre com sugestões; com ela abre depois de
  // digitar, para mostrar as duas seções (e o aviso) mesmo sem título.
  const expanded =
    (open || screen) &&
    (showRecent ||
      (peopleLabels
        ? typed && query.length >= SUGGESTION_MIN_LENGTH
        : hasOptions));
  const titlesMessage = !peopleLabels
    ? null
    : titlesSettled && fetched.failed
      ? peopleLabels.failed
      : titlesSettled && items.length === 0
        ? peopleLabels.emptyTitles.replace("{query}", () => query)
        : null;
  const peopleMessage = !peopleLabels
    ? null
    : peopleTooShort
      ? peopleLabels.tooShort
      : peopleSettled && fetchedPeople?.failed
        ? peopleLabels.failed
        : peopleSettled && people.length === 0
          ? peopleLabels.emptyPeople.replace("{query}", () => personTerm)
          : null;

  const hasPeople = Boolean(peopleLabels);
  useEffect(() => {
    if (!hasPeople || !typed || peopleTooShort) return;
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
      if (document.activeElement === input.current) setOpen(true);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hasPeople, typed, peopleTooShort, personTerm]);

  useEffect(() => {
    if (!typed || query.length < SUGGESTION_MIN_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/sugestoes?${new URLSearchParams({ q: query })}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setFetched({ query: query.toLowerCase(), items: [], failed: true });
          if (document.activeElement === input.current) setOpen(true);
          return;
        }
        const body: { items: Suggestion[] } = await response.json();
        setFetched({ query: query.toLowerCase(), items: body.items });
        if (document.activeElement === input.current) setOpen(true);
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
  }, [query, typed]);

  // Navegou (escolheu uma sugestão, enviou a busca, usou o voltar do
  // navegador): a tela cheia fecha.
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const [seenLocation, setSeenLocation] = useState(locationKey);
  if (seenLocation !== locationKey) {
    setSeenLocation(locationKey);
    setEngaged(false);
    setOpen(false);
    setActive(-1);
  }
  // Voltar de outra tela (ex.: de "Ver tudo") traz o campo como ficou, ainda
  // com foco; sem tirá-lo o menu antigo reabriria sozinho.
  useEffect(() => {
    input.current?.blur();
  }, [locationKey]);

  // Com a tela cheia aberta a página de baixo não rola. O iOS ignora
  // `overflow: hidden` no body, então o gesto de rolar é cancelado em tudo que
  // não é a lista de sugestões (e na lista, quando ela não tem o que rolar). Nas
  // pontas da lista, `overscroll-contain` impede que o gesto passe para a página.
  useEffect(() => {
    if (!screen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const block = (event: TouchEvent) => {
      const el = list.current;
      if (
        el &&
        event.target instanceof Node &&
        el.contains(event.target) &&
        el.scrollHeight > el.clientHeight
      ) {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("touchmove", block);
    };
  }, [screen]);

  // No iOS o teclado não encolhe a janela do layout: ele desloca a área
  // visível. A camada acompanha a área visível (visualViewport), senão a tela
  // de baixo aparece por trás ao rolar com o teclado aberto.
  useEffect(() => {
    const layer = root.current;
    const viewport = window.visualViewport;
    if (!screen || !layer) return;
    // O iOS ignora `overflow: hidden` no body e rola a página por baixo quando
    // o toque cai fora da lista. Então a página inteira fica invisível
    // enquanto a busca ocupa a tela; a camada, filha do body, se mostra de
    // novo (visibility herda, mas o filho pode sobrescrever).
    const body = document.body;
    const previousVisibility = body.style.visibility;
    body.style.visibility = "hidden";
    layer.style.visibility = "visible";
    if (!viewport) {
      return () => {
        body.style.visibility = previousVisibility;
        layer.style.visibility = "";
      };
    }
    const sync = () => {
      // A camada vai até o fim da janela do layout, por baixo do teclado e da
      // barra dele, que no iOS é translúcida: assim a tela de baixo nunca
      // aparece. A lista reserva o espaço do teclado para o fim dela ficar
      // alcançável.
      const covered = Math.max(
        0,
        window.innerHeight - viewport.offsetTop - viewport.height,
      );
      layer.style.top = `${viewport.offsetTop}px`;
      layer.style.height = `${window.innerHeight}px`;
      layer.style.bottom = "auto";
      layer.style.setProperty("--search-keyboard", `${covered}px`);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      layer.style.top = "";
      layer.style.height = "";
      layer.style.bottom = "";
      layer.style.removeProperty("--search-keyboard");
      layer.style.visibility = "";
      body.style.visibility = previousVisibility;
    };
  }, [screen]);

  // Fecha a tela cheia e apaga o que foi digitado (como o X do iOS).
  function refreshRecents() {
    if (recentLabels) setRecents(loadRecentSearches());
  }

  // Guarda o que acabou de ser feito: um termo buscado ou uma sugestão aceita
  // (lê o armazenamento de novo: outra aba pode ter mudado a lista).
  function remember(item: RecentSearch) {
    if (!recentLabels) return;
    const next = addRecentSearch(loadRecentSearches(), item);
    saveRecentSearches(next);
    setRecents(next);
  }

  function forget(item: RecentSearch) {
    const next = removeRecentSearch(loadRecentSearches(), item);
    saveRecentSearches(next);
    setRecents(next);
  }

  function forgetAll() {
    saveRecentSearches([]);
    setRecents([]);
  }

  function closeScreen() {
    setValue("");
    setTyped(false);
    setEngaged(false);
    setOpen(false);
    setActive(-1);
    input.current?.blur();
  }

  function clear() {
    setValue("");
    refreshRecents();
    setOpen(true);
    setActive(-1);
    input.current?.focus();
  }

  // "Ver tudo" de Séries e filmes e Enter sem escolher: com a seção Usuários
  // abre a Buscar em Tudo (o filtro Tudo/Séries/Filmes é da tela de
  // resultados); sem ela, a busca herda a aba e o filtro da URL.
  function openTitlesSearch(term = query) {
    setOpen(false);
    setEngaged(false);
    remember({ kind: "query", term });
    router.push(
      peopleLabels
        ? searchHref({ query: term })
        : nextSearchHref(term, pathname, searchParams),
    );
  }

  // Clicar numa recente: um termo preenche o campo e executa a busca; um
  // título ou usuário aceito abre direto, e sobe para o topo da lista.
  function openRecent(item: RecentSearch) {
    if (item.kind === "query") {
      setValue(item.term);
      return openTitlesSearch(item.term);
    }
    setOpen(false);
    setEngaged(false);
    remember(item);
    router.push(
      item.kind === "title" ? titleRefPath(item) : `/@${item.handle}`,
    );
  }

  function openPeopleSearch() {
    setOpen(false);
    setEngaged(false);
    remember({ kind: "query", term: query });
    router.push(searchHref({ query, people: true }));
  }

  function openSuggestion(index: number) {
    if (index >= optionCount) return;
    if (showRecent) return openRecent(recents[index]);
    setOpen(false);
    setEngaged(false);
    if (index < items.length) {
      const { mediaType, externalId, title, year, posterPath } = items[index];
      remember({
        kind: "title",
        mediaType,
        externalId,
        title,
        year,
        posterPath,
      });
      router.push(titleRefPath(items[index]));
    } else {
      const { handle, displayName } = people[index - items.length];
      remember({ kind: "person", handle, displayName });
      router.push(`/@${handle}`);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Com a seção Usuários, o Enter sem escolher abre a busca em Séries e
    // filmes: os campos escondidos do formulário só sabem o da URL.
    if (
      peopleLabels &&
      event.key === "Enter" &&
      !event.nativeEvent.isComposing &&
      (!expanded || active < 0 || !hasOptions) &&
      query
    ) {
      event.preventDefault();
      return openTitlesSearch();
    }
    // Visitante: o formulário envia a busca sozinho; só guarda o termo.
    if (
      !peopleLabels &&
      event.key === "Enter" &&
      !event.nativeEvent.isComposing &&
      (!expanded || active < 0) &&
      query
    ) {
      remember({ kind: "query", term: query });
    }
    if (screen && event.key === "Escape") {
      event.preventDefault();
      return closeScreen();
    }
    if (!expanded) return;
    if (event.key === "Escape") {
      // Fecha só a lista; sem isso o campo de busca também limparia o texto.
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!hasOptions) return;
    const last = optionCount - 1;
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
  const titlesListId = `${listId}-titulos`;
  const peopleListId = `${listId}-usuarios`;
  const recentListId = `${listId}-recentes`;
  const optionClass = (index: number) =>
    cn(
      "flex cursor-pointer items-center gap-3 rounded-xl p-1.5",
      active === index && "bg-muted",
    );

  return (
    <div
      ref={root}
      className={cn(
        "relative min-w-0 flex-1",
        screen &&
          "max-md:fixed max-md:inset-0 max-md:z-50 max-md:overscroll-contain max-md:flex max-md:flex-col max-md:bg-background",
      )}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div
        className={cn(
          "relative flex min-w-0 items-center",
          screen && "max-md:gap-2 max-md:p-3",
        )}
      >
        <div className="relative min-w-0 flex-1">
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
            aria-controls={
              showRecent
                ? recentListId
                : peopleLabels
                  ? `${titlesListId} ${peopleListId}`
                  : titlesListId
            }
            aria-autocomplete="list"
            aria-activedescendant={
              expanded && hasOptions && active >= 0
                ? optionId(active)
                : undefined
            }
            aria-label={ariaLabel}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setTyped(true);
              setOpen(true);
            }}
            // Também ao tocar: se o campo seguiu focado depois de fechar (ex.:
            // Enter sem a URL mudar), não há novo "focus" para reabrir.
            onClick={() => {
              refreshRecents();
              if (mobileScreen) setEngaged(true);
            }}
            onFocus={() => {
              refreshRecents();
              setOpen(true);
              if (mobileScreen) setEngaged(true);
            }}
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
        </div>
        {screen && mobileScreen ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={mobileScreen.close}
            title={mobileScreen.close}
            onClick={closeScreen}
            className="shrink-0 rounded-full bg-muted hover:bg-muted/80 md:hidden"
          >
            <Icon name="close" className="size-4 pointer-coarse:size-5" />
          </Button>
        ) : null}
      </div>
      <div
        ref={list}
        hidden={!expanded}
        // Mantém o foco no campo ao clicar numa sugestão ou em "Ver tudo".
        onMouseDown={(event) => event.preventDefault()}
        className={cn(
          "absolute top-full z-50 mt-2 w-full min-w-0 sm:min-w-72 overflow-hidden rounded-card border border-border bg-popover p-1.5 text-popover-foreground shadow-lg",
          screen &&
            "max-md:static max-md:mt-0 max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-md:overscroll-contain max-md:pb-[var(--search-keyboard,0px)] max-md:rounded-none max-md:border-0 max-md:bg-background max-md:px-3 max-md:shadow-none",
          listClassName,
        )}
      >
        {showRecent && recentLabels ? (
          <SearchSuggestionSection
            heading={recentLabels.heading}
            seeAllLabel={recentLabels.clear}
            seeAllAriaLabel={recentLabels.clearAria}
            onSeeAll={forgetAll}
            chevron={false}
            message={null}
            listId={recentListId}
            listLabel={recentLabels.heading}
            empty={false}
          >
            {recents.map((item, index) => (
              <li
                key={recentKey(item)}
                id={optionId(index)}
                role="option"
                aria-selected={active === index}
                onMouseEnter={() => setActive(index)}
                onClick={() => openSuggestion(index)}
                className={optionClass(index)}
              >
                <SearchRecentItem
                  item={item}
                  labels={labels}
                  removeLabel={recentLabels.remove.replace("{term}", () =>
                    recentName(item),
                  )}
                  onRemove={() => forget(item)}
                />
              </li>
            ))}
          </SearchSuggestionSection>
        ) : null}
        {showRecent ? null : (
          <>
            <SearchSuggestionSection
              heading={labels.titlesHeading}
              seeAllLabel={labels.seeAllShort}
              seeAllAriaLabel={labels.seeAll.replace("{query}", () => query)}
              onSeeAll={() => openTitlesSearch()}
              message={titlesMessage}
              listId={titlesListId}
              listLabel={labels.suggestions}
              empty={items.length === 0}
            >
              {items.map((item, index) => (
                <li
                  key={`${item.mediaType}-${item.externalId}`}
                  id={optionId(index)}
                  role="option"
                  aria-selected={active === index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => openSuggestion(index)}
                  className={optionClass(index)}
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
            </SearchSuggestionSection>
            {peopleLabels ? (
              <SearchSuggestionSection
                heading={peopleLabels.heading}
                seeAllLabel={labels.seeAllShort}
                seeAllAriaLabel={peopleLabels.seeAll.replace(
                  "{query}",
                  () => personTerm,
                )}
                // Com menos de 3 letras a busca de usuários não roda: sem "Ver tudo".
                onSeeAll={peopleTooShort ? undefined : openPeopleSearch}
                message={peopleMessage}
                listId={peopleListId}
                listLabel={peopleLabels.suggestions}
                empty={people.length === 0}
              >
                {people.map((person, i) => {
                  const index = items.length + i;
                  return (
                    <li
                      key={person.handle}
                      id={optionId(index)}
                      role="option"
                      aria-selected={active === index}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => openSuggestion(index)}
                      className={optionClass(index)}
                    >
                      <SearchPersonSuggestion
                        handle={person.handle}
                        displayName={person.displayName}
                      />
                    </li>
                  );
                })}
              </SearchSuggestionSection>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
