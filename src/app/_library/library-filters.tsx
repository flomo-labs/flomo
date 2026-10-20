"use client";

import { type ReactNode, useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import { LIBRARY_FILTERS, type LibraryFilter } from "@/contracts/library";

// Abas da Biblioteca. As listas de todas as abas chegam de uma vez, então
// trocar de aba é instantâneo. A aba vive só nesta tela: não vai para a URL
// nem é lembrada (ao reabrir, volta para "Todos").
export function LibraryFilters({
  lists,
  labels,
}: {
  lists: Record<LibraryFilter, ReactNode>;
  labels: { filters: string; filter: Record<LibraryFilter, string> };
}) {
  const [filter, setFilter] = useState<LibraryFilter>("all");

  return (
    <>
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        ariaLabel={labels.filters}
        options={LIBRARY_FILTERS.map((f) => ({
          value: f,
          label: labels.filter[f],
        }))}
      />
      {lists[filter]}
    </>
  );
}
