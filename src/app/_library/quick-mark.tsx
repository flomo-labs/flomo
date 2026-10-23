"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { markEpisode, markMovie } from "./actions";

export type QuickMarkTarget =
  | { kind: "episode"; episodeId: string }
  | { kind: "movie"; titleId: string };

// Marca só este item como assistido, sem perguntar sobre episódios
// anteriores: na fila "Seguintes" o episódio é, por definição, o seguinte ao
// mais avançado que o usuário viu. Enquanto marca, o círculo fica magenta com
// um indicador (girando; parado com `prefers-reduced-motion`). Sem aviso no
// canto: quem usa segura a linha desde `onStart` e mostra `done` (check
// magenta) em `onMarked`, que só vem quando o carregamento terminou (a ação
// respondeu e a lista nova já chegou). Com erro, `onFailed` solta a linha e a
// mensagem fica embaixo do botão.
export function QuickMark({
  target,
  label,
  failed,
  done = false,
  onStart,
  onMarked,
  onFailed,
}: {
  target: QuickMarkTarget;
  label: string;
  failed: string;
  done?: boolean;
  onStart?: () => void;
  onMarked?: () => void;
  onFailed?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // A ação responde antes de a lista nova chegar; o carregamento só acaba
  // quando `pending` volta a falso. Até lá, o sucesso fica guardado aqui.
  const succeeded = useRef(false);
  useEffect(() => {
    if (!pending && succeeded.current) {
      succeeded.current = false;
      onMarked?.();
    }
  }, [pending, onMarked]);

  function mark() {
    setError(null);
    onStart?.();
    startTransition(async () => {
      try {
        const result =
          target.kind === "episode"
            ? await markEpisode({ episodeId: target.episodeId })
            : await markMovie({ titleId: target.titleId });
        if (!result.ok) {
          setError(result.error.message || failed);
          onFailed?.();
          return;
        }
        succeeded.current = true;
      } catch {
        setError(failed);
        onFailed?.();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={pending || done ? "default" : "outline"}
        className="size-11 rounded-full disabled:opacity-100"
        aria-label={label}
        aria-busy={pending}
        title={label}
        disabled={pending || done}
        onClick={mark}
      >
        {done ? (
          <Icon name="check" filled className="size-5" />
        ) : pending ? (
          // Anel aberto; gira só sem `prefers-reduced-motion`. O check fica
          // para quando o carregamento terminar.
          <span
            aria-hidden
            className="size-5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
          />
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
