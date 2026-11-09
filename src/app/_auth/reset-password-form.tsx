"use client";

import { useActionState, useState, type FormEvent } from "react";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";
import { resetPassword, type NewPasswordState } from "./actions";
import { passwordsMatch } from "./auth-mode";
import { PASSWORD_ERRORS, PASSWORD_HINT } from "./password-messages";

// Senha nova depois do link do e-mail (#288). Com sucesso a ação redireciona
// e as outras sessões da conta são encerradas.
export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<NewPasswordState, FormData>(
    resetPassword,
    {},
  );
  const [mismatch, setMismatch] = useState(false);

  // Cancelar o envio (em vez de tratar no `action`) evita que o React limpe os
  // campos de senha.
  function checkPasswords(event: FormEvent<HTMLFormElement>) {
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

  const error = mismatch
    ? PASSWORD_ERRORS.PASSWORD_MISMATCH
    : state.error
      ? PASSWORD_ERRORS[state.error]
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Crie uma senha nova</h1>
      <form
        action={action}
        onSubmit={checkPasswords}
        className="flex flex-col gap-3"
      >
        <PasswordField
          id="senha-nova"
          name="password"
          label="Senha nova"
          hint={PASSWORD_HINT}
          required
          minLength={8}
          onChange={() => setMismatch(false)}
        />
        <PasswordField
          id="confirmar-senha-nova"
          name="confirmPassword"
          label="Confirmar senha"
          required
          aria-invalid={mismatch || undefined}
          onChange={() => setMismatch(false)}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar senha"}
        </Button>
      </form>
    </div>
  );
}
