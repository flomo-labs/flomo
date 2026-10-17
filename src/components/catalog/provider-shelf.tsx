"use client";

import { type ReactNode, useRef, useState, useTransition } from "react";
import { loadProviderShelf } from "@/app/_catalog/provider-shelf-actions";
import type { MediaSegment } from "@/app/_catalog/segments";
import { cn } from "@/lib/utils";

// Prateleira já montada pelo servidor para um serviço e tipo.
export type ProviderShelfData = {
  providerId: string;
  segment: MediaSegment;
  segments: MediaSegment[];
  heading: string;
  content: ReactNode;
};

type Labels = {
  providerNav: string;
  mediaNav: string;
  media: Record<MediaSegment, string>;
};

const pill = (active: boolean) =>
  cn(
    "inline-flex rounded-lg border px-3 py-1.5 text-sm transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border hover:bg-muted",
  );

// "Em alta no serviço X" com os menus de serviço e tipo. A escolha vive só
// nesta tela: não vai para a URL nem é lembrada (volta ao padrão ao reabrir).
export function ProviderShelf({
  providers,
  labels,
  initial,
  footer,
}: {
  providers: { id: string; name: string }[];
  labels: Labels;
  initial: ProviderShelfData;
  footer: ReactNode;
}) {
  const [data, setData] = useState(initial);
  const [selected, setSelected] = useState({
    providerId: initial.providerId,
    segment: initial.segment,
  });
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  function choose(providerId: string, segment: MediaSegment) {
    const request = ++latest.current;
    setSelected({ providerId, segment });
    startTransition(async () => {
      try {
        const next = await loadProviderShelf(providerId, segment);
        if (request !== latest.current) return;
        setData(next);
        setSelected({ providerId: next.providerId, segment: next.segment });
      } catch {
        if (request !== latest.current) return;
        setSelected({ providerId: data.providerId, segment: data.segment });
      }
    });
  }

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="em-alta-no-servico"
    >
      <h2 id="em-alta-no-servico" className="text-xl font-semibold">
        {data.heading}
      </h2>
      <ul aria-label={labels.providerNav} className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={p.id === selected.providerId}
              className={pill(p.id === selected.providerId)}
              onClick={() => choose(p.id, selected.segment)}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      <ul aria-label={labels.mediaNav} className="flex gap-2">
        {data.segments.map((s) => (
          <li key={s}>
            <button
              type="button"
              aria-pressed={s === selected.segment}
              className={pill(s === selected.segment)}
              onClick={() => choose(selected.providerId, s)}
            >
              {labels.media[s]}
            </button>
          </li>
        ))}
      </ul>
      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        {data.content}
      </div>
      {footer}
    </section>
  );
}
