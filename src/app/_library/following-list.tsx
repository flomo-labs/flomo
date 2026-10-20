"use client";

import Link from "next/link";
import { useState } from "react";
import { PosterRow } from "@/components/catalog/poster-row";
import { EmptyState } from "@/components/empty-state";
import { SegmentedControl } from "@/components/segmented-control";
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

  const shown = rows
    .filter((r) => kind === "both" || r.mediaType === kind)
    .slice(0, max);

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={kind}
        onChange={setKind}
        ariaLabel={labels.filters}
        options={FOLLOWING_KINDS.map((k) => ({
          value: k,
          label: labels.kinds[k],
        }))}
      />
      {shown.length === 0 ? (
        <EmptyState message={labels.emptyFilter} />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((row) => (
            <li key={row.titleId}>
              <PosterRow
                posterPath={row.posterPath}
                posterAlt={row.posterAlt}
                size="sm"
                centered
                trailing={
                  <QuickMark
                    target={row.mark}
                    label={row.markLabel}
                    failed={labels.markFailed}
                  />
                }
              >
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
              </PosterRow>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
