"use client";

import { useActionState, useState, type FormEvent } from "react";
import { passwordsMatch, type AuthMode } from "./auth-mode";
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

type Mode = AuthMode;

// As abas descrevem a situação de quem chega, não a ação do botão.
const MODES = [
  { value: "signIn", label: "Já tenho conta" },
  { value: "signUp", label: "Sou novo aqui" },
] as const;

const TITLES: Record<Mode, string> = {
  signIn: "Entrar na sua conta",
  signUp: "Criar sua conta",
};

const GOOGLE_LABELS: Record<Mode, string> = {
  signIn: "Entrar com o Google",
  signUp: "Criar conta com o Google",
};

const PASSWORD_MISMATCH = "As senhas não são iguais.";

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

// Entrar e criar conta numa tela só: título, Google e e-mail e senha mudam
// conforme a aba (a inicial vem de `?modo=criar`). Google no topo e e-mail e
// senha abaixo.
// Cadastro feito troca tudo pelo aviso de confirmação (o e-mail só vale depois
// de abrir o link).
export function EmailAuthPanel({
  next,
  googleError,
  initialMode = "signIn",
}: {
  next: string;
  googleError?: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [mismatch, setMismatch] = useState(false);
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
        <h1 className="text-2xl font-bold">Confira seu e-mail</h1>
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

  const error = mismatch
    ? PASSWORD_MISMATCH
    : state.error
      ? ERROR_MESSAGES[state.error]
      : googleError;

  // Senhas diferentes: avisa antes de enviar. Cancelar o envio (em vez de
  // tratar no `action`) evita que o React limpe os campos de senha.
  function checkPasswords(event: FormEvent<HTMLFormElement>) {
    if (!isSignUp) return;
    const data = new FormData(event.currentTarget);
    if (
      !passwordsMatch(
        String(data.get("password") ?? ""),
        String(data.get("confirmPassword") ?? ""),
      )
    ) {
      event.preventDefault();
      setMismatch(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{TITLES[mode]}</h1>
      <SegmentedControl
        value={mode}
        onChange={(next) => {
          setMismatch(false);
          setMode(next);
        }}
        options={MODES}
        ariaLabel="Já tenho conta ou sou novo aqui"
      />
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton className="w-full">{GOOGLE_LABELS[mode]}</GoogleButton>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        ou
        <Separator className="flex-1" />
      </div>
      <form
        action={isSignUp ? signUpAction : signInAction}
        onSubmit={checkPasswords}
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
            onChange={() => setMismatch(false)}
          />
          {isSignUp ? (
            <p id="senha-dica" className="text-xs text-muted-foreground">
              Mínimo de 8 caracteres.
            </p>
          ) : (
            <Link
              href="/esqueci-senha"
              className="self-start text-xs text-muted-foreground underline underline-offset-4"
            >
              Esqueci a senha
            </Link>
          )}
        </div>
        {isSignUp ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmar-senha">Confirmar senha</Label>
            <Input
              id="confirmar-senha"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={mismatch || undefined}
              onChange={() => setMismatch(false)}
            />
          </div>
        ) : null}
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
      <p className="text-sm text-muted-foreground">
        {isSignUp ? "Já tem conta? " : "Primeira vez no Flomo? "}
        <button
          type="button"
          className="underline underline-offset-4 hover:text-foreground"
          onClick={() => {
            setMismatch(false);
            setMode(isSignUp ? "signIn" : "signUp");
          }}
        >
          {isSignUp ? "Entrar" : "Criar conta"}
        </button>
      </p>
    </div>
  );
}
