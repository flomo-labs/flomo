"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { changePassword } from "../_auth/actions";
import { passwordsMatch } from "../_auth/auth-mode";
import { PASSWORD_ERRORS, PASSWORD_HINT } from "../_auth/password-messages";

// Trocar a senha de quem entra com e-mail e senha (#288): senha atual, senha
// nova e confirmação. As outras sessões da conta são encerradas.
export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCurrent("");
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }

  function submit() {
    if (!passwordsMatch(password, confirm)) {
      setError(PASSWORD_ERRORS.PASSWORD_MISMATCH);
      return;
    }
    startTransition(async () => {
      const result = await changePassword(current, password, confirm);
      if (result.error) {
        setError(
          result.error === "INVALID_PASSWORD" && password.length >= 8
            ? "Senha atual incorreta. Tente de novo."
            : PASSWORD_ERRORS[result.error],
        );
        return;
      }
      toast.success("Senha alterada.", { id: "senha-alterada" });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Trocar senha
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>
            Você continua entrando neste aparelho; nos outros, será preciso
            entrar de novo.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <PasswordField
            id="senha-atual"
            label="Senha atual"
            autoComplete="current-password"
            required
            value={current}
            onChange={(event) => {
              setCurrent(event.target.value);
              setError(null);
            }}
          />
          <PasswordField
            id="senha-nova-troca"
            label="Senha nova"
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
            id="confirmar-senha-troca"
            label="Confirmar senha nova"
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
              {pending ? "Salvando..." : "Salvar senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
