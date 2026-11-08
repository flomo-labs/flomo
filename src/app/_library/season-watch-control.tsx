"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { MarkWatchDateInput } from "@/contracts/library";
import { markSeason, unmarkEpisodes } from "./actions";
import {
  SeasonUnmarkDialog,
  type SeasonUnmarkDialogLabels,
} from "./season-unmark-dialog";
import {
  SeasonMarkDialog,
  type SeasonMarkDialogLabels,
} from "./season-mark-dialog";

export type SeasonWatchLabels = {
  // Texto da linha: "Temporada 1 · 24 episódios".
  summary: string;
  markSeason: string;
  seasonWatched: string;
  seasonWatchedUndo: string;
  // "9 de 24 vistos"
  progress: string;
  // Avisos de "Temporada 1 marcada (1 episódio)"; o de vários traz "{count}".
  markedOne: string;
  markedMany: string;
  undone: string;
  undo: string;
  failed: string;
  dialog: SeasonMarkDialogLabels;
  unmarkDialog: SeasonUnmarkDialogLabels;
};

type Props = {
  seasonNumber: number;
  titleId: string;
  // Episódios da temporada que o usuário já viu e total da temporada.
  watched: number;
  total: number;
  // Lançados que ainda faltam marcar. Zero = a temporada já está vista.
  missing: number;
  // Episódios da temporada já vistos, para desmarcar depois de recarregar.
  watchedEpisodeIds: string[];
  today: string;
  labels: SeasonWatchLabels;
};

// Linha "Temporada N · X episódios" com o botão de marcar a temporada inteira
// e a barra de progresso (só com ao menos um episódio visto). O botão é
// secundário (contorno) para não competir com a situação da série. Depois de
// marcar, o aviso verde e o botão trazem "Desfazer", que tira só os
// episódios marcados agora (os ids ficam aqui, na tela). Ao recarregar, o
// botão "Temporada vista" continua ativo: pede confirmação e desmarca todos os
// episódios vistos da temporada.
export function SeasonWatchControl({
  seasonNumber,
  titleId,
  watched,
  total,
  missing,
  watchedEpisodeIds,
  today,
  labels,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [unmarkOpen, setUnmarkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Episódios marcados agora, para desfazer.
  const [undoIds, setUndoIds] = useState<string[] | null>(null);

  const complete = missing === 0;

  function undo(ids: string[]) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await unmarkEpisodes({ episodeIds: ids });
        if (!result.ok) {
          setError(result.error.message || labels.failed);
          return;
        }
        setUndoIds(null);
        toast.success(labels.undone, { id: `temporada-${seasonNumber}` });
      } catch {
        setError(labels.failed);
      }
    });
  }

  function confirmUnmark() {
    setUnmarkOpen(false);
    undo(watchedEpisodeIds);
  }

  function confirm(when: MarkWatchDateInput) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        const result = await markSeason({ titleId, seasonNumber, when });
        if (!result.ok) {
          setError(result.error.message || labels.failed);
          return;
        }
        const ids = result.value.markedEpisodeIds;
        setUndoIds(ids.length > 0 ? ids : null);
        if (ids.length > 0) {
          const message =
            ids.length === 1
              ? labels.markedOne
              : labels.markedMany.replace("{count}", () => String(ids.length));
          toast.success(message, {
            id: `temporada-${seasonNumber}`,
            action: { label: labels.undo, onClick: () => undo(ids) },
          });
        }
      } catch {
        setError(labels.failed);
      }
    });
  }

  return (
    <div className="flex max-w-reading flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-sm text-muted-foreground">{labels.summary}</p>
        {complete && undoIds ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => undo(undoIds)}
            className="h-auto min-h-8 max-w-full rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11"
          >
            <Icon name="checkmarkDone" />
            {labels.seasonWatchedUndo}
          </Button>
        ) : complete ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending || watchedEpisodeIds.length === 0}
            onClick={() => setUnmarkOpen(true)}
            className="h-auto min-h-8 max-w-full rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11"
          >
            <Icon name="checkmarkDone" />
            {labels.seasonWatched}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(true)}
            className="h-auto min-h-8 max-w-full rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11"
          >
            <Icon name="checkmarkDone" />
            {labels.markSeason}
          </Button>
        )}
      </div>
      {watched > 0 ? (
        <Progress
          value={watched}
          max={total}
          aria-valuetext={labels.progress}
          className="gap-1.5"
        >
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {labels.progress}
          </span>
        </Progress>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <SeasonUnmarkDialog
        open={unmarkOpen}
        onOpenChange={setUnmarkOpen}
        pending={pending}
        labels={labels.unmarkDialog}
        onConfirm={confirmUnmark}
      />
      <SeasonMarkDialog
        open={open}
        onOpenChange={setOpen}
        today={today}
        pending={pending}
        labels={labels.dialog}
        onConfirm={confirm}
      />
    </div>
  );
}
