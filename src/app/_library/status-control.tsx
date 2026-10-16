"use client";

import { CheckIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LibraryStatus } from "@/domain/library/values";
import {
  changeTitleHidden,
  changeTitleStatus,
  removeFromLibrary,
  type LibraryActionResult,
} from "./actions";

export type StatusControlLabels = {
  add: string;
  inLibrary: string;
  dialogTitle: string;
  currentStatus: string;
  hide: string;
  unhide: string;
  watchLater: string;
  stopWatching: string;
  remove: string;
  removeHint: string;
  cancel: string;
  failed: string;
  // Nome de cada situação.
  status: Record<LibraryStatus, string>;
};

// Fora da biblioteca, o botão põe o título em Quero ver. Dentro, ele muda de
// aparência e abre um diálogo para ocultar, pausar, abandonar ou remover.
// Assistido não é escolhido aqui: vem de marcar o que foi visto.
export function StatusControl({
  titleId,
  status,
  hidden,
  labels,
}: {
  titleId: string;
  // Ausente = o título não está na biblioteca.
  status?: LibraryStatus;
  hidden: boolean;
  labels: StatusControlLabels;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<LibraryActionResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) setOpen(false);
        else setError(result.error.message || labels.failed);
      } catch {
        setError(labels.failed);
      }
    });
  }

  if (!status) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => changeTitleStatus({ titleId, status: "watchlist" }))
          }
        >
          {labels.add}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const setStatus = (next: "paused" | "dropped") =>
    run(() => changeTitleStatus({ titleId, status: next }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="secondary" size="sm" />}
      >
        <CheckIcon data-icon="inline-start" />
        {labels.inLibrary}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.dialogTitle}</DialogTitle>
          <DialogDescription>
            {labels.currentStatus}: {labels.status[status]}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => changeTitleHidden({ titleId, hidden: !hidden }))
            }
          >
            {hidden ? labels.unhide : labels.hide}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || status === "paused"}
            onClick={() => setStatus("paused")}
          >
            {labels.watchLater}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || status === "dropped"}
            onClick={() => setStatus("dropped")}
          >
            {labels.stopWatching}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => removeFromLibrary({ titleId }))}
          >
            {labels.remove}
          </Button>
          <p className="text-xs text-muted-foreground">{labels.removeHint}</p>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {labels.cancel}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
