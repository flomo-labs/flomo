"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { GoogleButton } from "@/components/google-button";
import { GoogleLogo } from "@/components/google-logo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SignInMethod } from "@/domain/account/ports";
import {
  linkGoogle,
  unlinkGoogle,
  type UnlinkFormState,
} from "../_auth/actions";

const UNLINK_ERRORS = {
  LAST_METHOD: "Você precisa de pelo menos uma forma de entrar.",
  NOT_LINKED: "O Google já não está vinculado.",
} as const;

// Formas de entrar da conta (#81). O e-mail e senha só aparece como
// informação; o Google pode ser vinculado e desvinculado, menos quando é a
// única forma de entrar (a ação confere de novo no servidor).
export function SignInMethods({
  methods,
  linkError,
}: {
  methods: readonly SignInMethod[];
  linkError?: boolean;
}) {
  const [state, unlinkAction, pending] = useActionState<
    UnlinkFormState | null,
    FormData
  >(async () => unlinkGoogle(), null);
  const hasGoogle = methods.includes("google");
  const hasEmail = methods.includes("email");
  const isLast = methods.length <= 1;

  useEffect(() => {
    if (state && !state.error) {
      toast.success("Google desvinculado.", { id: "google-desvinculado" });
    }
  }, [state]);

  const error = state?.error
    ? UNLINK_ERRORS[state.error]
    : linkError
      ? "Não foi possível vincular o Google. Tente de novo."
      : undefined;

  const unlinkButton = (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending || isLast}
    >
      {pending ? "Desvinculando..." : "Desvincular"}
    </Button>
  );

  return (
    <div className="flex w-full flex-col gap-2">
      {hasEmail ? <Row name="E-mail e senha" status="Vinculado" /> : null}
      <Row
        name="Google"
        icon={<GoogleLogo />}
        status={hasGoogle ? "Vinculado" : "Não vinculado"}
      >
        {hasGoogle ? (
          <form action={unlinkAction}>
            {isLast ? (
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} />}>
                  {unlinkButton}
                </TooltipTrigger>
                <TooltipContent>
                  Você precisa de pelo menos uma forma de entrar
                </TooltipContent>
              </Tooltip>
            ) : (
              unlinkButton
            )}
          </form>
        ) : (
          <form action={linkGoogle}>
            <GoogleButton className="h-8 text-xs pointer-coarse:h-11">
              Vincular conta do Google
            </GoogleButton>
          </form>
        )}
      </Row>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Row({
  name,
  icon,
  status,
  children,
}: {
  name: string;
  icon?: React.ReactNode;
  status: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-card border p-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
