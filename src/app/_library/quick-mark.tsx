"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markEpisode, markMovie } from "./actions";

export type QuickMarkTarget =
  | { kind: "episode"; episodeId: string }
  | { kind: "movie"; titleId: string };

// Marca só este item como assistido, sem perguntar sobre episódios
// anteriores: na fila "Seguintes" o episódio é, por definição, o seguinte ao
// mais avançado que o usuário viu.
export function QuickMark({
  target,
  label,
  failed,
}: {
  target: QuickMarkTarget;
  label: string;
  failed: string;
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
        if (!result.ok) setError(result.error.message || failed);
      } catch {
        setError(failed);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="size-11 rounded-full"
        aria-label={label}
        title={label}
        disabled={pending}
        onClick={mark}
      ></Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
