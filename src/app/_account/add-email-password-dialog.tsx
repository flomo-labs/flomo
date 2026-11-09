"use client";

import { useState, useTransition } from "react";
import { PasswordField } from "@/components/password-field";
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
import { addEmailAndPassword } from "../_auth/actions";
import { passwordsMatch } from "../_auth/auth-mode";
import { PASSWORD_ERRORS, PASSWORD_HINT } from "../_auth/password-messages";

const ERRORS = {
  ...PASSWORD_ERRORS,
  INVALID_EMAIL: "Digite um e-mail válido.",
} as const;

// Adicionar e-mail e senha a uma conta que entra só pelo Google (#288). O
// e-mail pode ser outro que não o do Google e só vale depois do link enviado a
// ele; até lá, a conta segue entrando pelo Google.
export function AddEmailPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setEmail("");
      setPassword("");
      setConfirm("");
      setError(null);
      setSentTo(null);
    }
  }

  function submit() {
    if (!passwordsMatch(password, confirm)) {
      setError(ERRORS.PASSWORD_MISMATCH);
      return;
    }
    startTransition(async () => {
      const result = await addEmailAndPassword(email, password, confirm);
      if (result.error) {
        setError(ERRORS[result.error]);
        return;
      }
      setSentTo(email.trim());
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Adicionar e-mail e senha
      </DialogTrigger>
      <DialogContent>
        {sentTo ? (
          <>
            <DialogHeader>
              <DialogTitle>Confira seu e-mail</DialogTitle>
              <DialogDescription>
                Se {sentTo} puder ser usado, enviamos um link para confirmá-lo.
                Depois de abrir o link, você poderá entrar com e-mail e senha.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Entendi</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Adicionar e-mail e senha</DialogTitle>
              <DialogDescription>
                Entre também com e-mail e senha. O e-mail pode ser diferente do
                da sua conta do Google.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="email-novo">E-mail</Label>
                <Input
                  id="email-novo"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                />
              </div>
              <PasswordField
                id="senha-nova-email"
                label="Senha"
                hint={PASSWORD_HINT}
                required
                minLength={8}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
              />
              <PasswordField
                id="confirmar-senha-email"
                label="Confirmar senha"
                required
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value);
                  setError(null);
                }}
              />
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Enviando..." : "Enviar link de confirmação"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
