"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { MarkWatchDateInput } from "@/contracts/library";
import {
  WatchDateChoice,
  type WatchDateChoiceLabels,
} from "./watch-date-choice";

export type SeasonMarkDialogLabels = WatchDateChoiceLabels & {
  title: string;
  // Quantos episódios faltam e quantos já estavam marcados, já escritos.
  description: string;
  cancel: string;
};

// Confirmação de "marcar a temporada inteira": o próprio diálogo é a
// confirmação, e cada opção de data (`WatchDateChoice`) já marca ao tocar.
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <WatchDateChoice
          title={labels.title}
          description={labels.description}
          today={today}
          pending={pending}
          labels={labels}
          cancelLabel={labels.cancel}
          onCancel={() => onOpenChange(false)}
          onChoose={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
