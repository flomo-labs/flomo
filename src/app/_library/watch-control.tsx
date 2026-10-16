"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { WatchDateInput } from "@/contracts/library";
import {
  changeWatchDate,
  markEpisode,
  markMovie,
  unmarkEpisode,
  unmarkMovie,
  type LibraryActionResult,
} from "./actions";

export type WatchControlLabels = {
  markWatched: string;
  watched: string;
  unmark: string;
  unmarkConfirm: string;
  changeDate: string;
  today: string;
  noDate: string;
  pickDate: string;
  saveDate: string;
  failed: string;
};

type Props = {
  kind: "episode" | "movie";
  // Id do episódio ou do filme.
  targetId: string;
  // Ausente = ainda não visto. `dateLabel` já vem formatado.
  watched?: { eventId: string; dateLabel: string };
  // AAAA-MM-DD de hoje, limite do seletor de data.
  today: string;
  labels: WatchControlLabels;
};

// Marcar com a data de hoje é o padrão (DEFAULT_WATCH_DATE no domínio); a
// data se tira ou se troca depois, sem sair da lista.
export function WatchControl({
  kind,
  targetId,
  watched,
  today,
  labels,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedDay, setPickedDay] = useState(today);

  function run(action: () => Promise<LibraryActionResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) setError(result.error.message || labels.failed);
      } catch {
        setError(labels.failed);
      }
    });
  }

  const mark = () =>
    run(() =>
      kind === "episode"
        ? markEpisode({ episodeId: targetId })
        : markMovie({ titleId: targetId }),
    );
  const unmark = () => {
    if (!window.confirm(labels.unmarkConfirm)) return;
    run(() =>
      kind === "episode"
        ? unmarkEpisode({ episodeId: targetId })
        : unmarkMovie({ titleId: targetId }),
    );
  };
  const setDate = (when: WatchDateInput) => {
    if (!watched) return;
    run(() => changeWatchDate({ eventId: watched.eventId, when }));
  };

  return (
    <div className="flex flex-col gap-2">
      {watched ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {labels.watched} · {watched.dateLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={unmark}
          >
            {labels.unmark}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={mark}
          className="self-start"
        >
          {labels.markWatched}
        </Button>
      )}
      {watched ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {labels.changeDate}
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setDate({ kind: "now" })}
            >
              {labels.today}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setDate({ kind: "unknown" })}
            >
              {labels.noDate}
            </Button>
            <label className="flex items-center gap-2">
              <span className="sr-only">{labels.pickDate}</span>
              <input
                type="date"
                value={pickedDay}
                max={today}
                min="1900-01-01"
                onChange={(e) => setPickedDay(e.target.value)}
                className="h-7 rounded-lg border border-border bg-background px-2 text-sm"
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={pending || !pickedDay}
              onClick={() =>
                setDate({ kind: "date", precision: "day", value: pickedDay })
              }
            >
              {labels.saveDate}
            </Button>
          </div>
        </details>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
