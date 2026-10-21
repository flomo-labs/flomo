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
  history: string;
  deleteRecord: string;
  deleteRecordConfirm: string;
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
// uma grade de duas colunas (conteúdo, check). No filme, botões de texto.
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
  const [pickedDay, setPickedDay] = useState(today);
  // Diálogo "só este ou também os anteriores" aberto.
  const [askPrevious, setAskPrevious] = useState(false);
  // Episódio já visto: o check abre "desmarcar, ver de novo ou cancelar".
  const [choosing, setChoosing] = useState(false);
  // Diálogo de "Mudar a data" do registro mais recente.
  const [changingDate, setChangingDate] = useState(false);
  // Desmarcar e apagar registro apagam dados: pedem confirmação num diálogo.
  const [confirming, setConfirming] = useState<
    { kind: "unmark" } | { kind: "delete"; eventId: string } | null
  >(null);

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
  const confirmAction = () => {
    const action = confirming;
    setConfirming(null);
    if (!action) return;
    if (action.kind === "delete") {
      run(() => removeWatchRecord({ eventId: action.eventId }));
    } else {
      run(() =>
        kind === "episode"
          ? unmarkEpisode({ episodeId: targetId })
          : unmarkMovie({ titleId: targetId }),
      );
    }
  };
  const setDate = (when: WatchDateInput) => {
    if (!watched) return;
    setChangingDate(false);
    run(() => changeWatchDate({ eventId: watched.eventId, when }));
  };

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
          className="col-start-2 row-start-1 row-span-3 size-11 self-center rounded-full"
        >
          {watched ? <Icon name="check" className="size-5" /> : null}
        </Button>
      ) : null}
      {showBody ? (
        <div className="flex flex-col gap-2">
          {watched ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {labels.watched} · {watched.dateLabel}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={labels.changeDate}
                title={labels.changeDate}
                disabled={pending}
                onClick={() => setChangingDate(true)}
              >
                <Icon name="calendar" />
              </Button>
              {isEpisode ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirming({ kind: "unmark" })}
                >
                  {labels.unmark}
                </Button>
              )}
              {isEpisode ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={watchAgain}
                >
                  {labels.watchAgain}
                </Button>
              )}
            </div>
          ) : isEpisode ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={mark}
              >
                {labels.markWatched}
              </Button>
            </div>
          )}
          {watched && watched.records.length > 1 ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                {labels.history} ({watched.records.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {watched.records.map((record) => (
                  <li
                    key={record.eventId}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>{record.dateLabel}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={pending}
                      onClick={() =>
                        setConfirming({
                          kind: "delete",
                          eventId: record.eventId,
                        })
                      }
                    >
                      {labels.deleteRecord}
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      <Dialog open={changingDate} onOpenChange={setChangingDate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.changeDate}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDate({ kind: "now" })}
            >
              {labels.today}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDate({ kind: "unknown" })}
            >
              {labels.noDate}
            </Button>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">{labels.pickDate}</span>
              <input
                type="date"
                value={pickedDay}
                max={today}
                min="1900-01-01"
                onChange={(e) => setPickedDay(e.target.value)}
                className="h-11 rounded-lg border border-border bg-background px-2 text-base"
              />
            </label>
            <Button
              type="button"
              disabled={pending || !pickedDay}
              onClick={() =>
                setDate({ kind: "date", precision: "day", value: pickedDay })
              }
            >
              {labels.saveDate}
            </Button>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              {labels.cancel}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.watched}</DialogTitle>
            <DialogDescription>{labels.watchedChoice}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
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
              disabled={pending}
              onClick={() => {
                setChoosing(false);
                setConfirming(null);
                run(() => unmarkEpisode({ episodeId: targetId }));
              }}
            >
              {labels.unmark}
            </Button>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
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
            <Button type="button" disabled={pending} onClick={markWithPrevious}>
              {labels.markWithPrevious}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={markOnlyThis}
            >
              {labels.markOnlyThis}
            </Button>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              {labels.cancel}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirming?.kind === "delete"
                ? labels.deleteRecord
                : labels.unmark}
            </DialogTitle>
            <DialogDescription>
              {confirming?.kind === "delete"
                ? labels.deleteRecordConfirm
                : labels.unmarkConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {labels.cancel}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={confirmAction}
            >
              {confirming?.kind === "delete"
                ? labels.deleteRecord
                : labels.unmark}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
