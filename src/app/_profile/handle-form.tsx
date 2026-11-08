"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from "@/contracts/profile";
import type { HandleFormState } from "./actions";
import type { HandleFormLabels } from "./form-labels";
import { useIdentityPreview } from "./identity-preview";

type Props = {
  action: (
    state: HandleFormState,
    formData: FormData,
  ) => Promise<HandleFormState>;
  defaultHandle?: string;
  next?: string;
  labels: HandleFormLabels;
  // Em Configurações o botão é de contorno ("Alterar @usuário"); no primeiro
  // acesso, o principal ("Continuar").
  submitVariant?: "default" | "outline";
};

// Sucesso vira aviso no canto da tela (toast); erro fica no formulário. No
// primeiro acesso a ação redireciona, e o aviso não aparece. O campo é
// controlado: o React limpa o formulário ao fim da ação, e o botão só
// habilita quando o handle difere do gravado.
export function HandleForm({
  action,
  defaultHandle,
  next,
  labels,
  submitVariant = "default",
}: Props) {
  const preview = useIdentityPreview();
  const [state, formAction, pending] = useActionState(action, {});
  const [handle, setHandle] = useState(defaultHandle ?? "");
  const [saved, setSaved] = useState(defaultHandle ?? "");
  const [shownState, setShownState] = useState(state);
  if (state !== shownState) {
    setShownState(state);
    // Volta com o que foi enviado (ou, se salvou, com o handle gravado).
    if (state.submitted !== undefined) {
      setHandle(state.submitted);
      preview?.setHandle(state.submitted);
    }
    if (state.savedHandle) setSaved(state.savedHandle);
  }
  // O servidor corta espaços e passa para minúsculas: isso não é mudança.
  const changed = handle.trim().toLowerCase() !== saved;
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
      {labels.help ? (
        <p id="handle-ajuda" className="text-sm text-muted-foreground">
          {labels.help.replace(
            "{handle}",
            () => handle.trim().toLowerCase() || "…",
          )}
        </p>
      ) : null}
      <Label htmlFor="handle" className={labels.help ? "sr-only" : undefined}>
        {labels.label}
      </Label>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-muted-foreground md:text-sm"
        >
          @
        </span>
        <Input
          id="handle"
          name="handle"
          className="pl-7"
          value={handle}
          onChange={(event) => {
            setHandle(event.target.value);
            preview?.setHandle(event.target.value);
          }}
          required
          minLength={HANDLE_MIN_LENGTH}
          maxLength={HANDLE_MAX_LENGTH}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={[
            state.error ? errorId : "handle-dica",
            labels.help && "handle-ajuda",
          ]
            .filter(Boolean)
            .join(" ")}
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
      <Button
        type="submit"
        variant={submitVariant}
        disabled={pending || !changed}
      >
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}
