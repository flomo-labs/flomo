"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordReset,
  type PasswordResetRequestState,
} from "./actions";

const ERRORS = {
  INVALID_INPUT: "Digite um e-mail válido.",
  RATE_LIMITED: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  UNKNOWN: "Não foi possível concluir. Tente de novo.",
} as const;

// Pedir o link para redefinir a senha (#288). Depois do pedido, a tela é
// sempre a mesma, exista conta com o e-mail ou não.
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<
    PasswordResetRequestState,
    FormData
  >(requestPasswordReset, {});

  if (state.sent) {
    return (
      <div className="flex flex-col items-start gap-3" role="status">
        <Icon name="mail" className="size-8 text-primary" />
        <h1 className="text-2xl font-bold">Confira seu e-mail</h1>
        <p className="text-sm text-muted-foreground break-words">
          Se <strong className="font-semibold">{email}</strong> tiver uma conta,
          enviamos um link para redefinir a senha. Abra o link no mesmo
          navegador em que fez o pedido.
        </p>
        <Button
          variant="outline"
          render={<Link href="/entrar" />}
          nativeButton={false}
        >
          Voltar para entrar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Esqueceu a senha?</h1>
      <p className="text-sm text-muted-foreground">
        Digite o e-mail da sua conta e enviamos um link para criar uma senha
        nova.
      </p>
      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {ERRORS[state.error]}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Lembrou?{" "}
        <Link
          href="/entrar"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
