"use client";

import { type ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  function choose(value: unknown) {
    const next = LIBRARY_FILTERS.find((f) => f === value);
    if (next) setFilter(next);
  }

  return (
    <>
      <Tabs value={filter} onValueChange={choose}>
        <TabsList aria-label={labels.filters}>
          {LIBRARY_FILTERS.map((f) => (
            <TabsTrigger key={f} value={f}>
              {labels.filter[f]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {lists[filter]}
    </>
  );
}
