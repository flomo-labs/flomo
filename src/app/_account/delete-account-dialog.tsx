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
import type { SignInMethod } from "@/domain/account/ports";
import { Separator } from "@/components/ui/separator";
import {
  reauthenticateWithGoogle,
  reauthenticateWithPassword,
  type PasswordReauthState,
} from "../_auth/actions";
import { deleteOwnAccount, type DeleteAccountFormState } from "./actions";

const PASSWORD_ERRORS: Record<
  NonNullable<PasswordReauthState["error"]>,
  string
> = {
  INVALID_PASSWORD: "Senha incorreta. Tente de novo.",
  RATE_LIMITED: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  UNAUTHENTICATED: "Sua sessão expirou. Entre de novo.",
  UNKNOWN: "Não foi possível confirmar. Tente de novo.",
};

type Props = {
  // Formas de entrar da conta: decide se a nova entrada pede senha, Google
  // ou as duas.
  methods: SignInMethod[];
  // O que a pessoa digita para confirmar: o próprio @handle ou, com o handle
  // ainda provisório, a palavra "excluir".
  confirmWord: string;
  // Volta da nova entrada: abre já pedindo a confirmação.
  defaultOpen?: boolean;
  // Para onde a nova entrada devolve a pessoa.
  returnPath: string;
};

// Exclusão da própria conta (#73): confirmação digitada e, se a entrada for
// antiga (REAUTH_REQUIRED), nova entrada antes de apagar: senha para quem tem
// e-mail e Google para quem tem Google (#200).
export function DeleteAccountDialog({
  methods,
  confirmWord,
  defaultOpen = false,
  returnPath,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<DeleteAccountFormState>({});
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hasPassword = methods.includes("email");
  const hasGoogle = methods.includes("google") || !hasPassword;
  const needsReauth = state.error?.code === "REAUTH_REQUIRED";
  const confirmed =
    typed.trim().toLowerCase().replace(/^@/, "") === confirmWord.toLowerCase();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTyped("");
      setPassword("");
      setPasswordError(null);
      setState({});
    }
  }

  function confirm() {
    startTransition(async () => {
      // Com sucesso a ação redireciona para a landing e não volta.
      setState(await deleteOwnAccount());
    });
  }

  // Senha confirmada: a sessão foi renovada, então repete a exclusão.
  function confirmWithPassword() {
    startTransition(async () => {
      const reauth = await reauthenticateWithPassword(password);
      if (reauth.error) {
        setPasswordError(PASSWORD_ERRORS[reauth.error]);
        return;
      }
      setPasswordError(null);
      setPassword("");
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
              <DialogTitle>
                {hasPassword
                  ? "Confirme sua senha"
                  : "Entre de novo para confirmar"}
              </DialogTitle>
              <DialogDescription>
                {hasPassword
                  ? "Por segurança, a exclusão exige uma entrada recente. Digite sua senha para continuar."
                  : "Por segurança, a exclusão exige uma entrada recente. Entre com o Google e confirme de novo."}
              </DialogDescription>
            </DialogHeader>
            {hasPassword ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  confirmWithPassword();
                }}
              >
                <Label htmlFor="senha-exclusao">Senha</Label>
                <Input
                  id="senha-exclusao"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {passwordError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {passwordError}
                  </p>
                ) : null}
                <DialogFooter>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={password.length === 0 || pending}
                  >
                    {pending ? "Confirmando…" : "Confirmar e continuar"}
                  </Button>
                </DialogFooter>
              </form>
            ) : null}
            {hasPassword && hasGoogle ? (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                ou
                <Separator className="flex-1" />
              </div>
            ) : null}
            {hasGoogle ? (
              <form action={reauthenticateWithGoogle}>
                <input type="hidden" name="next" value={returnPath} />
                <DialogFooter>
                  <GoogleButton>Continuar com o Google</GoogleButton>
                </DialogFooter>
              </form>
            ) : null}
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
