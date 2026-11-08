"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  // Botão do cabeçalho: "Marcar" (o nome completo vai no aria-label).
  markSeason: string;
  markSeasonFull: string;
  seasonWatched: string;
  seasonWatchedFull: string;
  seasonWatchedUndo: string;
  // Menu do cabeçalho.
  menu: string;
  menuOnly: string;
  // "Marcar até esta temporada (1 a 6)"; some na temporada 1.
  menuThrough: string;
  menuUndo: string;
  // Avisos de "Temporada 1 marcada (1 episódio)"; o de vários traz "{count}".
  markedOne: string;
  markedMany: string;
  markedThrough: string;
  undone: string;
  undo: string;
  failed: string;
  dialog: SeasonMarkDialogLabels;
  dialogThrough: SeasonMarkDialogLabels;
  unmarkDialog: SeasonUnmarkDialogLabels;
};

type Props = {
  seasonNumber: number;
  titleId: string;
  // Lançados que ainda faltam marcar. Zero = a temporada já está vista.
  missing: number;
  // O mesmo somando as temporadas de 1 até esta ("marcar até esta temporada").
  missingThrough: number;
  // Episódios vistos da temporada, para "Desfazer temporada".
  watchedIds: string[];
  today: string;
  labels: SeasonWatchLabels;
};

type Mode = "single" | "through";

// Ações do cabeçalho de uma temporada na sanfona: botão de marcar a temporada
// inteira (secundário, de contorno, para não competir com a situação da
// série) e menu "⋮" com "só esta", "até esta" e "desfazer". Depois de marcar,
// o aviso verde e o botão trazem "Desfazer", que tira só os episódios
// marcados agora (os ids ficam aqui, na tela; ao recarregar a página o botão
// apenas mostra "Vista", que pede confirmação e desmarca todos os vistos, como "Desfazer temporada" do menu).
export function SeasonWatchControl({
  seasonNumber,
  titleId,
  missing,
  missingThrough,
  watchedIds,
  today,
  labels,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode | null>(null);
  const [unmarkOpen, setUnmarkOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Episódios marcados agora, para desfazer.
  const [undoIds, setUndoIds] = useState<string[] | null>(null);

  const complete = missing === 0;
  const toastId = `temporada-${seasonNumber}`;
  const buttonClass =
    "h-auto min-h-8 rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11";

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
        toast.success(labels.undone, { id: toastId });
      } catch {
        setError(labels.failed);
      }
    });
  }

  function confirmUnmark() {
    setUnmarkOpen(false);
    undo(watchedIds);
  }

  function confirm(when: MarkWatchDateInput) {
    const through = mode === "through";
    setMode(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await markSeason({
          titleId,
          seasonNumber,
          when,
          ...(through ? { throughSeason: true } : {}),
        });
        if (!result.ok) {
          setError(result.error.message || labels.failed);
          return;
        }
        const ids = result.value.markedEpisodeIds;
        setUndoIds(ids.length > 0 ? ids : null);
        if (ids.length > 0) {
          const count = () => String(ids.length);
          const message = through
            ? labels.markedThrough.replace("{count}", count)
            : ids.length === 1
              ? labels.markedOne
              : labels.markedMany.replace("{count}", count);
          toast.success(message, {
            id: toastId,
            action: { label: labels.undo, onClick: () => undo(ids) },
          });
        }
      } catch {
        setError(labels.failed);
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end justify-center gap-1">
      <div className="flex items-center gap-1">
        {complete && undoIds ? (
          <Button
            type="button"
            variant="default"
            disabled={pending}
            onClick={() => undo(undoIds)}
            className={buttonClass}
          >
            <Icon name="checkmarkDone" />
            {labels.seasonWatchedUndo}
          </Button>
        ) : complete ? (
          <Button
            type="button"
            variant="default"
            disabled={pending || watchedIds.length === 0}
            aria-label={labels.seasonWatchedFull}
            onClick={() => setUnmarkOpen(true)}
            className={buttonClass}
          >
            <Icon name="checkmarkDone" />
            {labels.seasonWatched}
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            disabled={pending}
            aria-label={labels.markSeasonFull}
            onClick={() => setMode("single")}
            className={buttonClass}
          >
            <Icon name="checkmarkDone" />
            {labels.markSeason}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={labels.menu}
            disabled={pending}
            className="grid size-8 shrink-0 place-items-center rounded-full outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 pointer-coarse:size-11"
          >
            <Icon name="ellipsisVertical" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-auto min-w-56 max-w-[calc(100vw-1rem)]"
          >
            <DropdownMenuItem
              disabled={complete}
              onClick={() => setMode("single")}
              className="pointer-coarse:min-h-11"
            >
              {labels.menuOnly}
            </DropdownMenuItem>
            {seasonNumber > 1 ? (
              <DropdownMenuItem
                disabled={missingThrough === 0}
                onClick={() => setMode("through")}
                className="pointer-coarse:min-h-11"
              >
                {labels.menuThrough}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              disabled={watchedIds.length === 0}
              onClick={() => setUnmarkOpen(true)}
              className="pointer-coarse:min-h-11"
            >
              {labels.menuUndo}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
        today={today}
        pending={pending}
        labels={mode === "through" ? labels.dialogThrough : labels.dialog}
        onConfirm={confirm}
      />
    </div>
  );
}
