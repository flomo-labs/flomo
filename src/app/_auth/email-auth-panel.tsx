"use client";

import { useActionState, useState } from "react";
import { GoogleButton } from "@/components/google-button";
import { Icon } from "@/components/icon";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type EmailFormState,
} from "./actions";

type Mode = "signIn" | "signUp";

const MODES = [
  { value: "signIn", label: "Entrar" },
  { value: "signUp", label: "Criar conta" },
] as const;

const ERROR_MESSAGES: Record<NonNullable<EmailFormState["error"]>, string> = {
  INVALID_CREDENTIALS: "E-mail ou senha incorretos.",
  INVALID_INPUT:
    "Use um e-mail válido e uma senha com pelo menos 8 caracteres.",
  WEAK_PASSWORD:
    "Use um e-mail válido e uma senha com pelo menos 8 caracteres.",
  RATE_LIMITED: "Muitas tentativas. Aguarde um pouco e tente de novo.",
  EMAIL_TAKEN: "Não foi possível concluir. Tente de novo.",
  UNKNOWN: "Não foi possível concluir. Tente de novo.",
};

// Entrar e criar conta numa tela só: Google no topo e e-mail e senha abaixo.
// Cadastro feito troca tudo pelo aviso de confirmação (o e-mail só vale depois
// de abrir o link).
export function EmailAuthPanel({
  next,
  googleError,
}: {
  next: string;
  googleError?: string;
}) {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmail,
    {},
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmail,
    {},
  );
  const [dismissed, setDismissed] = useState<EmailFormState | null>(null);
  const isSignUp = mode === "signUp";
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signUpPending : signInPending;

  if (signUpState.confirmationSent && dismissed !== signUpState) {
    return (
      <div className="flex flex-col items-start gap-3" role="status">
        <Icon name="mail" className="size-8 text-primary" />
        <h2 className="text-lg font-semibold">Confira seu e-mail</h2>
        <p className="text-sm text-muted-foreground break-words">
          Se <strong className="font-semibold">{email}</strong> puder ser usado,
          enviamos um link para ativar a conta. Abra o link para continuar.
        </p>
        <Button variant="outline" onClick={() => setDismissed(signUpState)}>
          Voltar
        </Button>
      </div>
    );
  }

  const error = state.error ? ERROR_MESSAGES[state.error] : googleError;
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={MODES}
        ariaLabel="Entrar ou criar conta"
      />
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton className="w-full">Continuar com o Google</GoogleButton>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        ou
        <Separator className="flex-1" />
      </div>
      <form
        action={isSignUp ? signUpAction : signInAction}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="next" value={next} />
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? 8 : undefined}
            aria-describedby={isSignUp ? "senha-dica" : undefined}
          />
          {isSignUp ? (
            <p id="senha-dica" className="text-xs text-muted-foreground">
              Mínimo de 8 caracteres.
            </p>
          ) : (
            <Link
              href="/em-breve"
              className="self-start text-xs text-muted-foreground underline underline-offset-4"
            >
              Esqueci a senha (em breve)
            </Link>
          )}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? isSignUp
              ? "Criando..."
              : "Entrando..."
            : isSignUp
              ? "Criar conta"
              : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
