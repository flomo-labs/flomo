"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from "@/contracts/profile";
import type { HandleFormState } from "./actions";
import type { HandleFormLabels } from "./form-labels";

type Props = {
  action: (
    state: HandleFormState,
    formData: FormData,
  ) => Promise<HandleFormState>;
  defaultHandle?: string;
  next?: string;
  labels: HandleFormLabels;
};

// Sucesso vira aviso no canto da tela (toast); erro fica no formulário. No
// primeiro acesso a ação redireciona, e o aviso não aparece.
export function HandleForm({ action, defaultHandle, next, labels }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errorId = "handle-erro";
  useEffect(() => {
    const handle = state.savedHandle;
    if (!handle) return;
    // Mesmo id: salvar de novo substitui o aviso em vez de empilhar.
    toast.success(
      labels.saved.replace("{handle}", () => handle),
      { id: "handle-salvo" },
    );
  }, [state, labels.saved]);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Label htmlFor="handle">{labels.label}</Label>
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
        {labels.hint}
      </p>
      {state.error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}
