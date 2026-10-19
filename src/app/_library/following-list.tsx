"use client";

import Link from "next/link";
import { useState } from "react";
import { Poster } from "@/components/catalog/poster";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuickMark, type QuickMarkTarget } from "./quick-mark";

export const FOLLOWING_KINDS = ["both", "tv", "movie"] as const;
export type FollowingKind = (typeof FOLLOWING_KINDS)[number];

// Tudo já traduzido pelo servidor: o componente só desenha.
export type FollowingRow = {
  titleId: string;
  mediaType: "tv" | "movie";
  title: string;
  posterPath: string | null;
  posterAlt: string;
  href: string;
  // "T2 · E3 · Nome" numa série; nulo em filme.
  detail: string | null;
  mark: QuickMarkTarget;
  markLabel: string;
};

export type FollowingLabels = {
  filters: string;
  kinds: Record<FollowingKind, string>;
  emptyFilter: string;
  markFailed: string;
};

function isKind(value: unknown): value is FollowingKind {
  return FOLLOWING_KINDS.includes(value as FollowingKind);
}

// Lista "Seguintes" com o menu Ambos / Séries / Filmes. A escolha vive
// só na tela (fora da URL, sem memória: reabrir volta para "Ambos"). Usada na Home e em /seguintes.
export function FollowingList({
  rows,
  labels,
  max,
}: {
  rows: FollowingRow[];
  labels: FollowingLabels;
  // Limite depois de filtrar (a Home mostra só os primeiros).
  max?: number;
}) {
  const [kind, setKind] = useState<FollowingKind>("both");

  function choose(value: unknown) {
    if (isKind(value)) setKind(value);
  }

  const shown = rows
    .filter((r) => kind === "both" || r.mediaType === kind)
    .slice(0, max);

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={kind} onValueChange={choose}>
        <TabsList aria-label={labels.filters}>
          {FOLLOWING_KINDS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {labels.kinds[k]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <p className="text-muted-foreground">{labels.emptyFilter}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((row) => (
            <li
              key={row.titleId}
              className="flex items-center gap-4 rounded-card border border-border p-3"
            >
              <Poster
                path={row.posterPath}
                size="w185"
                alt={row.posterAlt}
                className="w-12 shrink-0 sm:w-14"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  href={row.href}
                  className="truncate font-semibold hover:underline"
                >
                  {row.title}
                </Link>
                {row.detail ? (
                  <p className="truncate text-sm text-muted-foreground">
                    {row.detail}
                  </p>
                ) : null}
              </div>
              <QuickMark
                target={row.mark}
                label={row.markLabel}
                failed={labels.markFailed}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
