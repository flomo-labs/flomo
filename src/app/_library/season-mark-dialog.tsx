"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarkWatchDateInput } from "@/contracts/library";
import {
  toWatchDateInput,
  WatchDateChoice,
  type WatchDateChoiceKind,
  type WatchDateChoiceLabels,
} from "./watch-date-choice";

export type SeasonMarkDialogLabels = WatchDateChoiceLabels & {
  title: string;
  // Quantos episódios faltam e quantos já estavam marcados, já escritos.
  description: string;
  back: string;
  done: string;
};

// Confirmação de "marcar a temporada inteira": mesmas opções de data do
// diálogo de editar o registro (`WatchDateChoice`). "Hoje" já vem escolhida;
// "Concluir" marca, "Voltar" fecha sem marcar.
export function SeasonMarkDialog({
  open,
  onOpenChange,
  today,
  pending,
  labels,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  pending: boolean;
  labels: SeasonMarkDialogLabels;
  onConfirm: (when: MarkWatchDateInput) => void;
}) {
  const [kind, setKind] = useState<WatchDateChoiceKind>("now");
  const [day, setDay] = useState(today);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setKind("now");
          setDay(today);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <WatchDateChoice
          kind={kind}
          day={day}
          today={today}
          labels={labels}
          onKindChange={setKind}
          onDayChange={setDay}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {labels.back}
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={pending || (kind === "day" && !day)}
            onClick={() => onConfirm(toWatchDateInput(kind, day))}
          >
            {labels.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
