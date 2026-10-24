"use client";

import { useState, useTransition } from "react";
import { GoogleButton } from "@/components/google-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reauthenticateWithGoogle } from "../_auth/actions";
import { deleteOwnAccount, type DeleteAccountFormState } from "./actions";

type Props = {
  // O que a pessoa digita para confirmar: o próprio @handle ou, com o handle
  // ainda provisório, a palavra "excluir".
  confirmWord: string;
  // Volta da nova entrada: abre já pedindo a confirmação.
  defaultOpen?: boolean;
  // Para onde a nova entrada devolve a pessoa.
  returnPath: string;
};

// Exclusão da própria conta (#73): confirmação digitada e, se a entrada for
// antiga (REAUTH_REQUIRED), nova entrada com Google antes de apagar.
export function DeleteAccountDialog({
  confirmWord,
  defaultOpen = false,
  returnPath,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<DeleteAccountFormState>({});
  const [pending, startTransition] = useTransition();
  const needsReauth = state.error?.code === "REAUTH_REQUIRED";
  const confirmed =
    typed.trim().toLowerCase().replace(/^@/, "") === confirmWord.toLowerCase();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTyped("");
      setState({});
    }
  }

  function confirm() {
    startTransition(async () => {
      // Com sucesso a ação redireciona para a landing e não volta.
      setState(await deleteOwnAccount());
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Excluir conta
      </DialogTrigger>
      <DialogContent>
        {needsReauth ? (
          <>
            <DialogHeader>
              <DialogTitle>Entre de novo para confirmar</DialogTitle>
              <DialogDescription>
                Por segurança, a exclusão exige uma entrada recente. Entre com o
                Google e confirme de novo.
              </DialogDescription>
            </DialogHeader>
            <form action={reauthenticateWithGoogle}>
              <input type="hidden" name="next" value={returnPath} />
              <DialogFooter>
                <GoogleButton>Continuar com o Google</GoogleButton>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Excluir sua conta?</DialogTitle>
              <DialogDescription>
                Perfil, biblioteca, progresso, histórico, notas e comentários
                serão apagados. Não dá para desfazer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmar-exclusao">
                Para confirmar, digite{" "}
                <strong className="font-semibold">{confirmWord}</strong>
              </Label>
              <Input
                id="confirmar-exclusao"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              {state.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {state.error.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={!confirmed || pending}
                onClick={confirm}
              >
                {pending ? "Excluindo…" : "Excluir conta definitivamente"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
