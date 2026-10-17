"use client";

import { type ReactNode, useRef, useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIBRARY_FILTERS, type LibraryFilter } from "@/contracts/library";
import { loadLibraryList } from "./library-actions";

// Abas da Biblioteca. A aba vive só nesta tela: não vai para a URL nem é
// lembrada (ao reabrir, volta para "Todos").
export function LibraryFilters({
  initial,
  labels,
}: {
  initial: ReactNode;
  labels: { filters: string; filter: Record<LibraryFilter, string> };
}) {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [content, setContent] = useState(initial);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  function choose(value: unknown) {
    const next = LIBRARY_FILTERS.find((f) => f === value);
    if (!next) return;
    const request = ++latest.current;
    setFilter(next);
    startTransition(async () => {
      try {
        const list = await loadLibraryList(next);
        if (request === latest.current) setContent(list);
      } catch (error) {
        console.error("Falha ao trocar a aba da biblioteca:", error);
      }
    });
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
      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        {content}
      </div>
    </>
  );
}
