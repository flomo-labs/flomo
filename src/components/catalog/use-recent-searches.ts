"use client";

import { useCallback, useState } from "react";
import {
  clearRecents,
  listRecents,
  recordRecent,
  removeRecent,
} from "@/app/_recent-search/actions";
import {
  addRecentSearch,
  loadRecentSearches,
  type RecentSearch,
  removeRecentSearch,
  saveRecentSearches,
} from "@/lib/recent-searches";

// Só a chave do item (o que a remoção pede).
function keyOf(item: RecentSearch) {
  switch (item.kind) {
    case "query":
      return { kind: "query" as const, term: item.term };
    case "title":
      return {
        kind: "title" as const,
        mediaType: item.mediaType,
        externalId: item.externalId,
      };
    case "person":
      return { kind: "person" as const, handle: item.handle };
  }
}

// O que o servidor aceita registrar: de pessoa só o handle (nome e foto vêm do
// perfil atual).
function recordInput(item: RecentSearch) {
  return item.kind === "title" ? item : keyOf(item);
}

// Buscas recentes do campo de busca (#414). Quem entrou na conta tem o
// histórico no servidor (#425, Server Actions `_recent-search`); o visitante,
// só na visita (`sessionStorage`, some ao fechar a aba). A tela muda na hora e
// o servidor é avisado em seguida: se a chamada falhar, a lista se acerta na
// próxima leitura. `enabled` desliga tudo (sem textos de recentes).
export function useRecentSearches({
  enabled,
  signedIn,
}: {
  enabled: boolean;
  signedIn: boolean;
}) {
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  // Relê a lista (outra aba, o outro campo da página ou outro aparelho podem
  // ter mudado).
  const refresh = useCallback(() => {
    if (!enabled) return;
    if (!signedIn) return setRecents(loadRecentSearches());
    listRecents()
      .then((result) => {
        if (result.ok) setRecents(result.value.items);
      })
      .catch(() => {});
  }, [enabled, signedIn]);

  const remember = useCallback(
    (item: RecentSearch) => {
      if (!enabled) return;
      if (!signedIn) {
        const next = addRecentSearch(loadRecentSearches(), item);
        saveRecentSearches(next);
        return setRecents(next);
      }
      setRecents((current) => addRecentSearch(current, item));
      recordRecent(recordInput(item)).catch(() => {});
    },
    [enabled, signedIn],
  );

  const forget = useCallback(
    (item: RecentSearch) => {
      if (!signedIn) {
        const next = removeRecentSearch(loadRecentSearches(), item);
        saveRecentSearches(next);
        return setRecents(next);
      }
      setRecents((current) => removeRecentSearch(current, item));
      removeRecent(keyOf(item)).catch(() => {});
    },
    [signedIn],
  );

  const forgetAll = useCallback(() => {
    setRecents([]);
    if (signedIn) clearRecents().catch(() => {});
    else saveRecentSearches([]);
  }, [signedIn]);

  return { recents, refresh, remember, forget, forgetAll };
}
