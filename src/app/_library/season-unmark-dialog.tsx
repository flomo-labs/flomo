"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SeasonUnmarkDialogLabels = {
  title: string;
  // Quantos episódios deixam de constar como vistos, já escrito.
  description: string;
  confirm: string;
  cancel: string;
};

// Confirmação de "desmarcar a temporada inteira" (depois de recarregar, quando
// não há como desfazer só o que foi marcado agora). Apaga os registros de
// visualização dos episódios da temporada, inclusive as datas.
export function SeasonUnmarkDialog({
  open,
  onOpenChange,
  pending,
  labels,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  labels: SeasonUnmarkDialogLabels;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={pending}
            onClick={onConfirm}
          >
            {labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
