"use client";

import { useCallback, useRef, useState } from "react";
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
  // Conta as mudanças locais: uma leitura que começou antes de uma mudança é
  // descartada, para não trazer de volta o que a pessoa acabou de remover.
  const version = useRef(0);
  const loading = useRef(false);

  // Relê a lista (outra aba, o outro campo da página ou outro aparelho podem
  // ter mudado).
  const refresh = useCallback(() => {
    if (!enabled) return;
    if (!signedIn) return setRecents(loadRecentSearches());
    // Uma leitura por vez (foco e clique chegam juntos).
    if (loading.current) return;
    loading.current = true;
    const started = version.current;
    listRecents()
      .then((result) => {
        if (result.ok && version.current === started) {
          setRecents(result.value.items);
        }
      })
      .catch(() => {})
      .finally(() => {
        loading.current = false;
      });
  }, [enabled, signedIn]);

  // Se o servidor recusou uma mudança, volta ao que ele guarda.
  const settle = useCallback(
    (call: Promise<{ ok: boolean }>) => {
      call
        .then((result) => {
          if (!result.ok) refresh();
        })
        .catch(() => refresh());
    },
    [refresh],
  );

  const remember = useCallback(
    (item: RecentSearch) => {
      if (!enabled) return;
      if (!signedIn) {
        const next = addRecentSearch(loadRecentSearches(), item);
        saveRecentSearches(next);
        return setRecents(next);
      }
      version.current += 1;
      setRecents((current) => addRecentSearch(current, item));
      settle(recordRecent(recordInput(item)));
    },
    [enabled, signedIn, settle],
  );

  const forget = useCallback(
    (item: RecentSearch) => {
      if (!signedIn) {
        const next = removeRecentSearch(loadRecentSearches(), item);
        saveRecentSearches(next);
        return setRecents(next);
      }
      version.current += 1;
      setRecents((current) => removeRecentSearch(current, item));
      settle(removeRecent(keyOf(item)));
    },
    [signedIn, settle],
  );

  const forgetAll = useCallback(() => {
    version.current += 1;
    setRecents([]);
    if (signedIn) settle(clearRecents());
    else saveRecentSearches([]);
  }, [signedIn, settle]);

  return { recents, refresh, remember, forget, forgetAll };
}
