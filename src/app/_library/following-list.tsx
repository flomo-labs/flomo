"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { PosterRow } from "@/components/catalog/poster-row";
import { EmptyState } from "@/components/empty-state";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  // Anúncio ao leitor de tela depois de marcar ("Série T2:E3 marcado como
  // assistido.").
  markedLabel: string;
};

export type FollowingLabels = {
  filters: string;
  kinds: Record<FollowingKind, string>;
  emptyFilter: string;
  markFailed: string;
  seeMore: string;
};

// Itens por "página": 5 no celular (uma coluna) e 10 no desktop (duas colunas
// de 5). Além deles aparece a linha seguinte esmaecida, com "Ver mais" por
// cima: 1 item no celular, 2 no desktop.
const MOBILE_PAGE = 5;
const DESKTOP_PAGE = 10;

// Quanto tempo a linha recém-marcada fica com o check antes de dar lugar ao
// próximo item.
const HOLD_MS = 600;

// Linha sendo marcada: a cópia de antes de marcar, a posição em que estava e
// se o carregamento já terminou (`done`: mostra o check).
type Held = { row: FollowingRow; index: number; done: boolean };

// Lista "Seguintes" com o menu Todos / Séries / Filmes, à direita das
// seções (`sections`), como na Biblioteca. A escolha vive só na tela (fora da
// URL, sem memória: reabrir volta para "Todos").
//
// Ao marcar, a lista nova chega junto com a resposta: a série troca de
// episódio e sobe para o topo, o filme some. Para a pessoa ver que deu certo,
// a linha marcada fica no mesmo lugar desde o clique (com o indicador),
// mostra o check por HOLD_MS quando o carregamento termina e só então a lista
// segue.
//
// A lista mostra uma página por vez (MOBILE_PAGE / DESKTOP_PAGE) e "Ver mais"
// acrescenta outra. Celular e desktop se resolvem só com CSS (`max-md:` /
// `md:`), sem detectar a tela por JavaScript: nada pisca ao carregar.
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
  const [pages, setPages] = useState(1);
  // O que acabou de ser marcado, para o leitor de tela. Fica na lista, não no
  // botão: a linha marcada troca pelo próximo item ou some.
  const [announcement, setAnnouncement] = useState("");
  const [held, setHeld] = useState<Held[]>([]);

  const release = (titleId: string) =>
    setHeld((current) => current.filter((h) => h.row.titleId !== titleId));

  function start(row: FollowingRow, index: number) {
    setHeld((current) => [
      ...current.filter((h) => h.row.titleId !== row.titleId),
      { row, index, done: false },
    ]);
  }

  function marked(row: FollowingRow) {
    setAnnouncement(row.markedLabel);
    setHeld((current) =>
      current.map((h) =>
        h.row.titleId === row.titleId ? { ...h, done: true } : h,
      ),
    );
    setTimeout(() => release(row.titleId), HOLD_MS);
  }

  const inKind = (r: FollowingRow) => kind === "both" || r.mediaType === kind;
  // A linha nova de um título segurado não aparece: no lugar dela, a cópia
  // segurada, na posição em que estava.
  const heldIds = new Set(held.map((h) => h.row.titleId));
  const shown = rows.filter((r) => inKind(r) && !heldIds.has(r.titleId));
  for (const h of [...held].sort((a, b) => a.index - b.index)) {
    if (inKind(h.row)) {
      shown.splice(Math.min(h.index, shown.length), 0, h.row);
    }
  }
  // Até onde vai cada tela; o item seguinte (celular) ou a linha seguinte
  // (desktop) aparece esmaecida, com "Ver mais".
  const mobileEnd = MOBILE_PAGE * pages;
  const desktopEnd = DESKTOP_PAGE * pages;
  const rendered = shown.slice(0, desktopEnd + 2);
  const showMore = () => setPages((current) => current + 1);

  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {sections}
        <SegmentedControl
          value={kind}
          onChange={(next) => {
            setKind(next);
            setPages(1);
          }}
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
          {rendered.map((row, index) => {
            // Item esmaecido sob o "Ver mais": o seguinte no celular, os da
            // linha seguinte no desktop. Não recebe clique nem hover.
            const mobilePreview = index === mobileEnd;
            const desktopPreview = index >= desktopEnd;
            return (
              <li
                key={row.titleId}
                className={cn(
                  "relative min-w-0 rounded-card transition-colors hover:bg-muted/50",
                  index > mobileEnd && "max-md:hidden",
                  mobilePreview && "max-md:pointer-events-none",
                  desktopPreview && "md:pointer-events-none",
                )}
              >
                <div
                  className={cn(
                    mobilePreview && "max-md:opacity-40",
                    desktopPreview && "md:opacity-40",
                  )}
                >
                  <PosterRow
                    posterPath={row.posterPath}
                    posterAlt={row.posterAlt}
                    size="sm"
                    centered
                    trailing={
                      <div className="relative z-10">
                        <QuickMark
                          target={row.mark}
                          label={row.markLabel}
                          failed={labels.markFailed}
                          done={held.some(
                            (h) => h.row.titleId === row.titleId && h.done,
                          )}
                          onStart={() => start(row, index)}
                          onMarked={() => marked(row)}
                          onFailed={() => release(row.titleId)}
                        />
                      </div>
                    }
                  >
                    <Link
                      href={row.href}
                      className="truncate font-semibold hover:underline after:absolute after:inset-0 after:rounded-card"
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
                </div>
                {mobilePreview ? (
                  <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center md:hidden">
                    <SeeMore label={labels.seeMore} onClick={showMore} />
                  </div>
                ) : null}
                {index === desktopEnd ? (
                  // Centrado na linha, entre as duas colunas (gap-3: 6px de
                  // cada lado do vão).
                  <div className="pointer-events-auto absolute top-1/2 -right-1.5 z-20 hidden translate-x-1/2 -translate-y-1/2 md:block">
                    <SeeMore label={labels.seeMore} onClick={showMore} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// "Ver mais" em magenta, por cima da linha esmaecida.
function SeeMore({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" className="rounded-full px-5 shadow-lg" onClick={onClick}>
      {label}
    </Button>
  );
}
