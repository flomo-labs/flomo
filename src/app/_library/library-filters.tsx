"use client";

import { type ReactNode, useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";

// Visões da Biblioteca. As listas de todas as visões chegam de uma vez, então
// trocar é instantâneo. A visão vive só nesta tela: não vai para a URL nem é
// lembrada (ao reabrir, volta para a primeira).
export function LibraryFilters<T extends string>({
  views,
  lists,
  labels,
}: {
  views: readonly T[];
  lists: Record<T, ReactNode>;
  labels: { views: string; view: Record<T, string> };
}) {
  const [view, setView] = useState<T>(views[0]);

  return (
    <>
      <SegmentedControl
        value={view}
        onChange={setView}
        ariaLabel={labels.views}
        options={views.map((v) => ({ value: v, label: labels.view[v] }))}
      />
      {lists[view]}
    </>
  );
}
