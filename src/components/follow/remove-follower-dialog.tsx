"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { removeFollowerAction } from "@/app/_follow/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { fillName } from "./use-follow-toggle";

export type RemoveFollowerLabels = {
  // Item do menu e diálogo de confirmação ({name}).
  menuItem: string;
  confirmTitle: string;
  confirmDescription: string;
  confirm: string;
  cancel: string;
  // Avisos ({name}).
  removed: string;
  failed: string;
};

// Confirmação de "Remover seguidor", aberta pelo menu da pessoa na lista de
// seguidores do próprio dono (a pessoa deixa de seguir, não é avisada e pode
// pedir de novo). Depois da ação a lista tira a pessoa da tela (`onRemoved`).
export function RemoveFollowerDialog({
  followerId,
  name,
  open,
  onOpenChange,
  labels,
  onRemoved,
}: {
  followerId: string;
  // Nome para os avisos.
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: RemoveFollowerLabels;
  // Chamado depois que o servidor removeu (a lista tira a pessoa da tela).
  onRemoved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (pending) return;
    startTransition(async () => {
      try {
        const result = await removeFollowerAction({ followerId });
        if (!result.ok) {
          if (result.error.code === "UNAUTHENTICATED") {
            router.push("/entrar");
            return;
          }
          toast.error(result.error.message || labels.failed);
          return;
        }
        onOpenChange(false);
        toast.success(fillName(labels.removed, name));
        onRemoved?.();
      } catch {
        toast.error(labels.failed);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fillName(labels.confirmTitle, name)}</DialogTitle>
          <DialogDescription>
            {fillName(labels.confirmDescription, name)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {labels.cancel}
          </DialogClose>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? <Spinner /> : null}
            {labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
