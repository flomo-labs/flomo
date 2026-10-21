"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import type { WatchDateInput } from "@/contracts/library";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  changeWatchDate,
  markEpisode,
  markMovie,
  recordEpisodeAgain,
  recordMovieAgain,
  removeWatchRecord,
  unmarkEpisode,
  unmarkMovie,
  type LibraryActionResult,
} from "./actions";
import { WatchRecordsDialog } from "./watch-records-dialog";

export type WatchControlLabels = {
  markWatched: string;
  markOnlyThis: string;
  // "Marcar este e os N anteriores", já com o número de anteriores.
  markWithPrevious: string;
  previousTitle: string;
  // "Você tem N episódios não vistos antes deste.", já com o número.
  previousDescription: string;
  cancel: string;
  watchAgain: string;
  // Pergunta do diálogo que o check abre num episódio já visto.
  watchedChoice: string;
  back: string;
  done: string;
  editRecord: string;
  history: string;
  deleteRecord: string;
  deleteRecordConfirm: string;
  watched: string;
  unmark: string;
  unmarkConfirm: string;
  today: string;
  noDate: string;
  pickDate: string;
  failed: string;
};

type Props = {
  kind: "episode" | "movie";
  // Id do episódio ou do filme.
  targetId: string;
  // Ausente = ainda não visto. `dateLabel` já vem formatado.
  watched?: {
    eventId: string;
    dateLabel: string;
    // Todos os registros, do mais recente ao mais antigo.
    records: { eventId: string; dateLabel: string }[];
  };
  // Episódios anteriores ainda não vistos; com algum, marcar pergunta antes.
  previousUnwatched?: number;
  // AAAA-MM-DD de hoje, limite do seletor de data.
  today: string;
  labels: WatchControlLabels;
};

// Marcar com a data de hoje é o padrão (DEFAULT_WATCH_DATE no domínio); a
// data se tira ou se troca depois, sem sair da lista. No episódio o controle
// é o check em círculo (44px) e o resto vai numa linha abaixo; o pai deve ser
// uma grade de três colunas (data, nota, check). No filme, botões de texto.
export function WatchControl({
  kind,
  targetId,
  watched,
  previousUnwatched = 0,
  today,
  labels,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Diálogo "só este ou também os anteriores" aberto.
  const [askPrevious, setAskPrevious] = useState(false);
  // Episódio já visto: o check abre "desmarcar, ver de novo ou cancelar".
  const [choosing, setChoosing] = useState(false);
  // Diálogo com todos os registros (editar a data, apagar).
  const [recordsOpen, setRecordsOpen] = useState(false);
  // Desmarcar o filme apaga dados: pede confirmação num diálogo.
  const [confirmingUnmark, setConfirmingUnmark] = useState(false);

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

  const markThis = () =>
    run(() =>
      kind === "episode"
        ? markEpisode({ episodeId: targetId })
        : markMovie({ titleId: targetId }),
    );
  // Episódio com anteriores não vistos: pergunta antes de marcar.
  const mark = () => {
    if (kind === "episode" && previousUnwatched > 0) {
      setError(null);
      setAskPrevious(true);
    } else {
      markThis();
    }
  };
  const markWithPrevious = () => {
    setAskPrevious(false);
    run(() => markEpisode({ episodeId: targetId, includePrevious: true }));
  };
  const markOnlyThis = () => {
    setAskPrevious(false);
    markThis();
  };
  const watchAgain = () =>
    run(() =>
      kind === "episode"
        ? recordEpisodeAgain({ episodeId: targetId })
        : recordMovieAgain({ titleId: targetId }),
    );
  const unmark = () =>
    run(() =>
      kind === "episode"
        ? unmarkEpisode({ episodeId: targetId })
        : unmarkMovie({ titleId: targetId }),
    );
  const setDate = (eventId: string, when: WatchDateInput) =>
    run(() => changeWatchDate({ eventId, when }));

  const isEpisode = kind === "episode";
  const showBody = !isEpisode || watched !== undefined || error !== null;

  return (
    <>
      {isEpisode ? (
        <Button
          type="button"
          variant={watched ? "default" : "outline"}
          aria-label={watched ? labels.unmark : labels.markWatched}
          title={watched ? labels.unmark : labels.markWatched}
          disabled={pending}
          onClick={watched ? () => setChoosing(true) : mark}
          className="col-start-3 row-start-1 row-span-3 size-11 self-center rounded-full"
        >
          {watched ? <Icon name="check" className="size-5" /> : null}
        </Button>
      ) : null}
      {showBody ? (
        <div className="flex flex-col gap-2">
          {watched ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label={labels.history}
                title={labels.history}
                disabled={pending}
                onClick={() => setRecordsOpen(true)}
                className="size-11 rounded-full"
              >
                <Icon name="calendar" className="size-5" />
              </Button>
              <span className="text-sm font-medium">
                {labels.watched} · {watched.dateLabel}
              </span>
              {isEpisode ? null : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={pending}
                    onClick={() => setConfirmingUnmark(true)}
                  >
                    {labels.unmark}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={pending}
                    onClick={watchAgain}
                  >
                    {labels.watchAgain}
                  </Button>
                </>
              )}
            </div>
          ) : isEpisode ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={pending}
                onClick={mark}
              >
                {labels.markWatched}
              </Button>
            </div>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      {watched ? (
        <WatchRecordsDialog
          open={recordsOpen}
          onOpenChange={setRecordsOpen}
          records={watched.records}
          today={today}
          pending={pending}
          labels={labels}
          onSetDate={setDate}
          onDelete={(eventId) => run(() => removeWatchRecord({ eventId }))}
        />
      ) : null}
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.watched}</DialogTitle>
            <DialogDescription>{labels.watchedChoice}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="rounded-full"
              disabled={pending}
              onClick={() => {
                setChoosing(false);
                watchAgain();
              }}
            >
              {labels.watchAgain}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={pending}
              onClick={() => {
                setChoosing(false);
                unmark();
              }}
            >
              {labels.unmark}
            </Button>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                />
              }
            >
              {labels.cancel}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={askPrevious}
        onOpenChange={(open) => {
          if (!open) setAskPrevious(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.previousTitle}</DialogTitle>
            <DialogDescription>{labels.previousDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="rounded-full"
              disabled={pending}
              onClick={markWithPrevious}
            >
              {labels.markWithPrevious}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={pending}
              onClick={markOnlyThis}
            >
              {labels.markOnlyThis}
            </Button>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                />
              }
            >
              {labels.cancel}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmingUnmark} onOpenChange={setConfirmingUnmark}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.unmark}</DialogTitle>
            <DialogDescription>{labels.unmarkConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                />
              }
            >
              {labels.cancel}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={pending}
              onClick={() => {
                setConfirmingUnmark(false);
                unmark();
              }}
            >
              {labels.unmark}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
