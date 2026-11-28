// Buscas recentes do visitante (#414): ficam só na visita (`sessionStorage`, some
// ao fechar a aba), da mais nova para a mais antiga, sem repetir e até
// `RECENT_SEARCHES_MAX`. Quem entrou na conta guarda no servidor (#425, ver
// `use-recent-searches.ts`); as funções puras daqui valem para os dois. Cada
// item é um termo buscado ou uma sugestão aceita (título ou usuário). Toda
// leitura e escrita no armazenamento é protegida: em modo privado ou com dados
// bloqueados ele pode lançar erro, e a busca segue sem histórico.

import type { RecentSearchItem } from "@/domain/recent-search/ports";

export const RECENT_SEARCHES_KEY = "flomo:buscas-recentes";
export const RECENT_SEARCHES_MAX = 8;

export type RecentSearch = RecentSearchItem;

// Identidade do item para não repetir (termo sem diferenciar maiúsculas).
export function recentKey(item: RecentSearch): string {
  switch (item.kind) {
    case "query":
      return `q:${item.term.toLowerCase()}`;
    case "title":
      return `t:${item.mediaType}-${item.externalId}`;
    case "person":
      return `p:${item.handle.toLowerCase()}`;
  }
}

// Nome do item para leitores de tela ("Remover … das buscas recentes").
export function recentName(item: RecentSearch): string {
  switch (item.kind) {
    case "query":
      return item.term;
    case "title":
      return item.title;
    case "person":
      return item.displayName ?? `@${item.handle}`;
  }
}

// Coloca o item no topo e tira a repetição; termo vazio não entra. Função pura.
export function addRecentSearch(
  list: readonly RecentSearch[],
  item: RecentSearch,
): RecentSearch[] {
  const next =
    item.kind === "query" ? { ...item, term: item.term.trim() } : item;
  if (next.kind === "query" && !next.term) return [...list];
  const key = recentKey(next);
  return [next, ...list.filter((entry) => recentKey(entry) !== key)].slice(
    0,
    RECENT_SEARCHES_MAX,
  );
}

export function removeRecentSearch(
  list: readonly RecentSearch[],
  item: RecentSearch,
): RecentSearch[] {
  const key = recentKey(item);
  return list.filter((entry) => recentKey(entry) !== key);
}

// Formatos que o app gera; evita montar um caminho a partir de um valor
// alterado à mão no armazenamento.
const HANDLE_SAFE = /^[A-Za-z0-9._]{1,50}$/;
const EXTERNAL_ID_SAFE = /^[A-Za-z0-9_-]{1,40}$/;

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";
const orNull = (value: unknown) => (typeof value === "string" ? value : null);

// Lê um item guardado; o que não bate com nenhum formato é descartado. Texto
// solto (formato da primeira versão) vale como termo buscado.
function parseItem(raw: unknown): RecentSearch | null {
  if (isText(raw)) return { kind: "query", term: raw.trim() };
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.kind === "query" && isText(r.term)) {
    return { kind: "query", term: r.term.trim() };
  }
  if (
    r.kind === "title" &&
    (r.mediaType === "movie" || r.mediaType === "tv") &&
    typeof r.externalId === "string" &&
    EXTERNAL_ID_SAFE.test(r.externalId) &&
    isText(r.title)
  ) {
    return {
      kind: "title",
      mediaType: r.mediaType,
      externalId: r.externalId,
      title: r.title,
      year: orNull(r.year),
      posterPath: orNull(r.posterPath),
    };
  }
  if (
    r.kind === "person" &&
    typeof r.handle === "string" &&
    HANDLE_SAFE.test(r.handle)
  ) {
    return {
      kind: "person",
      handle: r.handle,
      displayName: orNull(r.displayName),
    };
  }
  return null;
}

// Aceita só uma lista de itens válidos; qualquer outra coisa guardada vale vazio.
export function parseRecentSearches(raw: string | null): RecentSearch[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map(parseItem)
      .filter((item): item is RecentSearch => item !== null)
      .slice(0, RECENT_SEARCHES_MAX);
  } catch {
    return [];
  }
}

export function loadRecentSearches(): RecentSearch[] {
  try {
    return parseRecentSearches(sessionStorage.getItem(RECENT_SEARCHES_KEY));
  } catch {
    return [];
  }
}

export function saveRecentSearches(list: readonly RecentSearch[]): void {
  try {
    if (list.length === 0) sessionStorage.removeItem(RECENT_SEARCHES_KEY);
    else sessionStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // Sem armazenamento: o histórico só não persiste.
  }
}

// Ao sair da conta o histórico da visita some junto.
export function clearRecentSearches(): void {
  saveRecentSearches([]);
}
