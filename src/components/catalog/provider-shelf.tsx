"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { loadProviderBundle } from "@/app/_catalog/provider-shelf-actions";
import type { MediaSegment } from "@/app/_catalog/segments";
import { SegmentedControl } from "@/components/segmented-control";
import { SectionHeader } from "@/components/section-header";
import { cn } from "@/lib/utils";

// Listas de um serviço, já montadas pelo servidor, uma por tipo.
export type ProviderBundle = {
  providerId: string;
  heading: string;
  segments: MediaSegment[];
  lists: Partial<Record<MediaSegment, ReactNode>>;
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

// "Em alta no serviço X" com os menus de serviço e tipo. O serviço aberto
// chega com todos os tipos; os outros serviços carregam em segundo plano logo
// depois do Descobrir abrir, um de cada vez. A escolha vive só nesta tela: não vai
// para a URL nem é lembrada (volta ao padrão ao reabrir).
export function ProviderShelf({
  providers,
  labels,
  initial,
  footer,
}: {
  providers: { id: string; name: string }[];
  labels: Labels;
  initial: ProviderBundle;
  footer: ReactNode;
}) {
  const [shown, setShown] = useState(initial);
  const [selected, setSelected] = useState({
    providerId: initial.providerId,
    segment: "tudo" as MediaSegment,
  });
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);
  const loads = useRef(
    new Map<string, Promise<ProviderBundle>>([
      [initial.providerId, Promise.resolve(initial)],
    ]),
  );

  function load(providerId: string) {
    let promise = loads.current.get(providerId);
    if (!promise) {
      const started = loadProviderBundle(providerId);
      started.catch(() => {
        if (loads.current.get(providerId) === started) {
          loads.current.delete(providerId);
        }
      });
      promise = started;
      loads.current.set(providerId, promise);
    }
    return promise;
  }

  useEffect(() => {
    let cancelled = false;
    const ids = providers.map((p) => p.id);
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      for (const id of ids) {
        if (cancelled) return;
        if (loads.current.has(id)) continue;
        await load(id).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
    // Roda uma vez, ao abrir a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseSegment(segment: MediaSegment) {
    setSelected((current) => ({ ...current, segment }));
  }

  function chooseProvider(providerId: string) {
    if (providerId === selected.providerId) return;
    const request = ++latest.current;
    setSelected((current) => ({ ...current, providerId }));
    startTransition(async () => {
      try {
        const next = await load(providerId);
        if (request !== latest.current) return;
        setShown(next);
        setSelected({ providerId, segment: "tudo" });
      } catch {
        if (request !== latest.current) return;
        setSelected((current) => ({
          ...current,
          providerId: shown.providerId,
        }));
      }
    });
  }

  const segment = shown.segments.includes(selected.segment)
    ? selected.segment
    : "tudo";

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="em-alta-no-servico"
    >
      <SectionHeader id="em-alta-no-servico" title={shown.heading} size="lg" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul aria-label={labels.providerNav} className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={p.id === selected.providerId}
                className={pill(p.id === selected.providerId)}
                onClick={() => chooseProvider(p.id)}
                onPointerEnter={() => void load(p.id).catch(() => {})}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
        <SegmentedControl
          value={segment}
          onChange={chooseSegment}
          ariaLabel={labels.mediaNav}
          options={shown.segments.map((s) => ({
            value: s,
            label: labels.media[s],
          }))}
        />
      </div>
      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        {shown.lists[segment]}
      </div>
      {footer}
    </section>
  );
}
