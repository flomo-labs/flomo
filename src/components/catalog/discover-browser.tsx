"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { loadProviderBundle } from "@/app/_catalog/provider-shelf-actions";
import { BASE_SEGMENTS, type MediaSegment } from "@/app/_catalog/segments";
import { ProviderShelf } from "@/components/catalog/provider-shelf";
import { ProviderStrip } from "@/components/catalog/provider-strip";
import { SectionHeader } from "@/components/section-header";
import { SegmentedControl } from "@/components/segmented-control";

// Listas de um serviço, já montadas pelo servidor, uma por tipo.
export type ProviderBundle = {
  providerId: string;
  segments: MediaSegment[];
  lists: Partial<Record<MediaSegment, ReactNode>>;
};

type Labels = {
  providerNav: string;
  mediaNav: string;
  allProviders: string;
  trending: string;
  nowPlaying: string;
  media: Record<MediaSegment, string>;
};

// Controles no topo do Descobrir: serviço (faixa de chips) e tipo (Todos,
// Séries, Filmes), que valem para todas as listas. Sem serviço ("Todos"):
// "Em alta" e "Nos cinemas" (esta só tem filmes, então some com "Séries").
// Com serviço: só "Em alta no serviço X". As listas chegam prontas do
// servidor; as dos serviços carregam em segundo plano logo depois de abrir, um
// de cada vez. A escolha vive só nesta tela: não vai para a URL nem é lembrada.
export function DiscoverBrowser({
  providers,
  labels,
  trending,
  nowPlaying,
  footer,
}: {
  // `lead` é o começo do título já concordado com o gênero do serviço ("Em alta na").
  providers: { id: string; name: string; lead: string }[];
  labels: Labels;
  trending: Partial<Record<MediaSegment, ReactNode>>;
  // Só os tipos que têm a lista (cinemas: sem séries).
  nowPlaying: Partial<Record<MediaSegment, ReactNode>>;
  footer: ReactNode;
}) {
  const [shown, setShown] = useState<ProviderBundle | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [segment, setSegment] = useState<MediaSegment>("tudo");
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);
  const loads = useRef(new Map<string, Promise<ProviderBundle>>());

  function load(id: string) {
    let promise = loads.current.get(id);
    if (!promise) {
      const started = loadProviderBundle(id);
      started.catch(() => {
        if (loads.current.get(id) === started) loads.current.delete(id);
      });
      promise = started;
      loads.current.set(id, promise);
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

  function chooseProvider(id: string | null) {
    if (id === providerId) return;
    const request = ++latest.current;
    setProviderId(id);
    if (id === null) {
      setShown(null);
      return;
    }
    startTransition(async () => {
      try {
        const next = await load(id);
        if (request !== latest.current) return;
        setShown(next);
      } catch {
        if (request !== latest.current) return;
        setProviderId(shown?.providerId ?? null);
      }
    });
  }

  const provider = providers.find((p) => p.id === shown?.providerId);
  // Sem serviço só há Todos, Séries e Filmes; com serviço, também Novelas e
  // Animes quando ele tiver títulos. Tipo que deixou de existir volta a Todos.
  const segments: MediaSegment[] = shown?.segments ?? [...BASE_SEGMENTS];
  const current = segments.includes(segment) ? segment : "tudo";

  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <div className="flex flex-col gap-4">
        <ProviderStrip
          providers={providers}
          value={providerId}
          onChange={chooseProvider}
          allLabel={labels.allProviders}
          ariaLabel={labels.providerNav}
        />
        <div>
          <SegmentedControl
            compactOnMobile={segments.length > 3}
            value={current}
            onChange={setSegment}
            ariaLabel={labels.mediaNav}
            options={segments.map((s) => ({
              value: s,
              label: labels.media[s],
            }))}
          />
        </div>
      </div>
      {shown && provider ? (
        <ProviderShelf
          title={`${provider.lead} ${provider.name}`}
          list={shown.lists[current]}
          pending={pending}
          footer={footer}
        />
      ) : (
        <div
          aria-busy={pending}
          className={
            pending
              ? "flex flex-col gap-10 opacity-60 md:gap-12"
              : "flex flex-col gap-10 md:gap-12"
          }
        >
          <section className="flex flex-col gap-3" aria-labelledby="trending">
            <SectionHeader id="trending" size="lg" title={labels.trending} />
            {trending[current]}
          </section>
          {nowPlaying[current] ? (
            <section
              className="flex flex-col gap-3"
              aria-labelledby="now_playing"
            >
              <SectionHeader
                id="now_playing"
                size="lg"
                title={labels.nowPlaying}
              />
              {nowPlaying[current]}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
