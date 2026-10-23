"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
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
  // Próximo episódio de uma série ("T2:E3" e o nome); nulos em filme.
  position: string | null;
  episodeName: string | null;
  mark: QuickMarkTarget;
  markLabel: string;
};

export type FollowingLabels = {
  filters: string;
  kinds: Record<FollowingKind, string>;
  emptyFilter: string;
  markFailed: string;
};

// Lista "Seguintes" com o menu Todos / Séries / Filmes, à direita das
// seções (`sections`), como na Biblioteca. A escolha vive só na tela (fora da
// URL, sem memória: reabrir volta para "Todos").
export function FollowingList({
  rows,
  labels,
  sections,
}: {
  rows: FollowingRow[];
  sections: ReactNode;
  labels: FollowingLabels;
}) {
  const [kind, setKind] = useState<FollowingKind>("both");

  const shown = rows.filter((r) => kind === "both" || r.mediaType === kind);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {sections}
        <SegmentedControl
          value={kind}
          onChange={setKind}
          ariaLabel={labels.filters}
          options={FOLLOWING_KINDS.map((k) => ({
            value: k,
            label: labels.kinds[k],
          }))}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState title={labels.emptyFilter} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {shown.map((row) => (
            <li key={row.titleId} className="min-w-0">
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
                {row.position ? (
                  <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <span className="shrink-0 rounded-full bg-primary/25 px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {row.position}
                    </span>
                    {row.episodeName ? (
                      <span className="truncate">{row.episodeName}</span>
                    ) : null}
                  </div>
                ) : null}
              </PosterRow>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
