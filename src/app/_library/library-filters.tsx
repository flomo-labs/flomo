"use client";

import { type ReactNode, useState } from "react";
import { SegmentedControl } from "@/components/segmented-control";
import type { LibraryFilter } from "@/contracts/library";

// Visões da Biblioteca. As listas de todas as visões chegam de uma vez, então
// trocar é instantâneo. A visão vive só nesta tela: não vai para a URL nem é
// lembrada (ao reabrir, volta para a primeira).
export function LibraryFilters({
  filters,
  lists,
  labels,
}: {
  filters: readonly LibraryFilter[];
  lists: Partial<Record<LibraryFilter, ReactNode>>;
  labels: {
    filters: string;
    filter: Partial<Record<LibraryFilter, string>>;
  };
}) {
  const [filter, setFilter] = useState<LibraryFilter>(filters[0]);

  return (
    <>
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        ariaLabel={labels.filters}
        options={filters.map((f) => ({
          value: f,
          label: labels.filter[f] ?? f,
        }))}
      />
      {lists[filter]}
    </>
  );
}
