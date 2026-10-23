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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Listas de um serviço, já montadas pelo servidor, uma por tipo.
export type ProviderBundle = {
  providerId: string;
  segments: MediaSegment[];
  lists: Partial<Record<MediaSegment, ReactNode>>;
};

type Labels = {
  providerNav: string;
  mediaNav: string;
  media: Record<MediaSegment, string>;
};

// Só o nome do serviço no título é o seletor: botão magenta com texto branco,
// na fonte do título (fica mais alto que a linha) e com 44px no toque.
const providerTrigger =
  "-my-1.5 h-auto max-w-full min-w-0 gap-2 rounded-full border-0 bg-primary px-4 py-1 font-[inherit] text-[length:inherit] leading-[inherit] text-primary-foreground hover:bg-primary/90 data-popup-open:bg-primary/90 pointer-coarse:min-h-11 [&_svg]:size-5";

// "Em alta no serviço X", com o serviço escolhido no título e o menu de tipo ao lado. O serviço aberto
// chega com todos os tipos; os outros serviços carregam em segundo plano logo
// depois do Descobrir abrir, um de cada vez. A escolha vive só nesta tela: não vai
// para a URL nem é lembrada (volta ao padrão ao reabrir).
export function ProviderShelf({
  providers,
  labels,
  initial,
  footer,
}: {
  // `lead` é o começo do título já concordado com o gênero do serviço ("Em alta na").
  providers: { id: string; name: string; lead: string }[];
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

  const provider = providers.find((p) => p.id === selected.providerId);
  const segment = shown.segments.includes(selected.segment)
    ? selected.segment
    : "tudo";

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="em-alta-no-servico"
    >
      <SectionHeader
        id="em-alta-no-servico"
        size="lg"
        wrap
        action={
          <SegmentedControl
            value={segment}
            onChange={chooseSegment}
            ariaLabel={labels.mediaNav}
            options={shown.segments.map((s) => ({
              value: s,
              label: labels.media[s],
            }))}
          />
        }
        title={
          <>
            {provider?.lead}{" "}
            <Select
              value={selected.providerId}
              items={providers.map((p) => ({ value: p.id, label: p.name }))}
              onValueChange={(id) => id && chooseProvider(id)}
              onOpenChange={(open) => {
                if (open) {
                  for (const p of providers) void load(p.id).catch(() => {});
                }
              }}
            >
              <SelectTrigger
                aria-label={labels.providerNav}
                className={providerTrigger}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        {shown.lists[segment]}
      </div>
      {footer}
    </section>
  );
}
