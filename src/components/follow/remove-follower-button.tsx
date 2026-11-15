"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

export type RemoveFollowerButtonLabels = {
  remove: string;
  // Diálogo de confirmação ({name}).
  confirmTitle: string;
  confirmDescription: string;
  confirm: string;
  cancel: string;
  // Nome acessível ({name}).
  removeAria: string;
  // Avisos ({name}).
  removed: string;
  failed: string;
};

const fill = (text: string, name: string) =>
  text.replaceAll("{name}", () => name);

// "Remover seguidor" na lista de seguidores do próprio dono. Pede confirmação
// (a pessoa deixa de seguir, não é avisada e pode pedir de novo). Depois da
// ação a tela é atualizada pelo servidor e a pessoa sai da lista. Quem monta a
// tela só o renderiza para o dono, na lista de seguidores.
export function RemoveFollowerButton({
  followerId,
  name,
  labels,
}: {
  followerId: string;
  // Nome para os avisos e nomes acessíveis.
  name: string;
  labels: RemoveFollowerButtonLabels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
        setOpen(false);
        toast.success(fill(labels.removed, name));
        router.refresh();
      } catch {
        toast.error(labels.failed);
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={fill(labels.removeAria, name)}
      >
        {labels.remove}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fill(labels.confirmTitle, name)}</DialogTitle>
            <DialogDescription>
              {fill(labels.confirmDescription, name)}
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
    </>
  );
}
