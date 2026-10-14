"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from "@/contracts/profile";
import type { HandleFormState } from "./actions";

type Props = {
  action: (
    state: HandleFormState,
    formData: FormData,
  ) => Promise<HandleFormState>;
  defaultHandle?: string;
  next?: string;
  submitLabel: string;
};

export function HandleForm({
  action,
  defaultHandle,
  next,
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errorId = "handle-erro";

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Label htmlFor="handle">Nome de usuário</Label>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-muted-foreground">
          @
        </span>
        <Input
          id="handle"
          name="handle"
          defaultValue={state.submitted ?? defaultHandle}
          required
          minLength={HANDLE_MIN_LENGTH}
          maxLength={HANDLE_MAX_LENGTH}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : "handle-dica"}
        />
      </div>
      <p id="handle-dica" className="text-xs text-muted-foreground">
        De {HANDLE_MIN_LENGTH} a {HANDLE_MAX_LENGTH} caracteres: letras,
        números, ponto ou sublinhado.
      </p>
      {state.error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      {state.savedHandle ? (
        <p role="status" className="text-sm">
          Agora você é @{state.savedHandle}.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
