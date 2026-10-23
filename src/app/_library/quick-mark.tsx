"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { markEpisode, markMovie } from "./actions";

export type QuickMarkTarget =
  | { kind: "episode"; episodeId: string }
  | { kind: "movie"; titleId: string };

// Marca só este item como assistido, sem perguntar sobre episódios
// anteriores: na fila "Seguintes" o episódio é, por definição, o seguinte ao
// mais avançado que o usuário viu. Enquanto marca, o círculo fica magenta com
// um indicador girando (o check, com `prefers-reduced-motion`); no sucesso, a
// linha já volta trocada pelo próximo item (ou some), sem aviso no canto, e
// `onMarked` deixa quem usa anunciar ao leitor de tela. Erro fica embaixo do
// botão.
export function QuickMark({
  target,
  label,
  failed,
  onMarked,
}: {
  target: QuickMarkTarget;
  label: string;
  failed: string;
  onMarked?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mark() {
    setError(null);
    startTransition(async () => {
      try {
        const result =
          target.kind === "episode"
            ? await markEpisode({ episodeId: target.episodeId })
            : await markMovie({ titleId: target.titleId });
        if (!result.ok) {
          setError(result.error.message || failed);
          return;
        }
        onMarked?.();
      } catch {
        setError(failed);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={pending ? "default" : "outline"}
        className="size-11 rounded-full disabled:opacity-100"
        aria-label={label}
        aria-busy={pending}
        title={label}
        disabled={pending}
        onClick={mark}
      >
        {pending ? (
          <>
            <span
              aria-hidden
              className="hidden size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-safe:block"
            />
            <Icon name="check" filled className="size-5 motion-safe:hidden" />
          </>
        ) : null}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
