"use client";

import { type ReactNode, useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";

// Visões e recortes por tipo da Biblioteca. As listas de todas as combinações
// chegam de uma vez, então trocar é instantâneo. A visão vive só nesta tela
// (ao reabrir, volta para a primeira); o tipo começa pelo da rota e a URL
// acompanha a troca, sem navegar.
export function LibraryFilters<V extends string, T extends string>({
  views,
  types,
  initialType,
  typePaths,
  lists,
  labels,
}: {
  views: readonly V[];
  types: readonly T[];
  initialType: T;
  typePaths: Record<T, string>;
  lists: Record<`${V}:${T}`, ReactNode>;
  labels: {
    views: string;
    view: Record<V, string>;
    types: string;
    type: Record<T, string>;
  };
}) {
  const [view, setView] = useState<V>(views[0]);
  const [type, setType] = useState<T>(initialType);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={view}
          onChange={setView}
          ariaLabel={labels.views}
          options={views.map((v) => ({ value: v, label: labels.view[v] }))}
        />
        <SegmentedControl
          compactOnMobile
          value={type}
          onChange={(next) => {
            setType(next);
            window.history.replaceState(null, "", typePaths[next]);
          }}
          ariaLabel={labels.types}
          options={types.map((t) => ({ value: t, label: labels.type[t] }))}
        />
      </div>
      {lists[`${view}:${type}`]}
    </>
  );
}
