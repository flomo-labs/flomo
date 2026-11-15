"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { block, unblock } from "@/app/_block/actions";
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

export type BlockButtonLabels = {
  block: string;
  unblock: string;
  // Diálogo de confirmação ({name}).
  confirmTitle: string;
  confirmDescription: string;
  confirm: string;
  cancel: string;
  // Nomes acessíveis ({name}).
  blockAria: string;
  unblockAria: string;
  // Avisos ({name}).
  blocked: string;
  unblocked: string;
  failed: string;
};

const fill = (text: string, name: string) =>
  text.replaceAll("{name}", () => name);

// Bloquear / Desbloquear no perfil de outra pessoa. Bloquear pede confirmação
// (o diálogo explica o que acontece); desbloquear age direto, porque não tira
// nada de ninguém. Depois da ação a tela é atualizada pelo servidor: o botão
// Seguir some do perfil bloqueado e volta ao desbloquear. Nunca aparece no
// perfil próprio (quem monta a tela não o renderiza).
export function BlockButton({
  profileId,
  name,
  blocked,
  labels,
}: {
  profileId: string;
  // Nome para os avisos e nomes acessíveis.
  name: string;
  blocked: boolean;
  labels: BlockButtonLabels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: typeof block | typeof unblock, success: string) {
    if (pending) return;
    startTransition(async () => {
      try {
        const result = await action({ profileId });
        if (!result.ok) {
          if (result.error.code === "UNAUTHENTICATED") {
            router.push("/entrar");
            return;
          }
          toast.error(result.error.message || labels.failed);
          return;
        }
        setOpen(false);
        toast.success(fill(success, name));
        router.refresh();
      } catch {
        toast.error(labels.failed);
      }
    });
  }

  if (blocked) {
    const aria = fill(labels.unblockAria, name);
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => run(unblock, labels.unblocked)}
        disabled={pending}
        aria-label={aria}
        title={aria}
      >
        {pending ? <Spinner /> : null}
        {labels.unblock}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={fill(labels.blockAria, name)}
      >
        {labels.block}
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
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(block, labels.blocked)}
            >
              {pending ? <Spinner /> : null}
              {labels.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
