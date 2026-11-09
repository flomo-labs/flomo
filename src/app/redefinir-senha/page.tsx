import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { LoadingRegion } from "@/components/loading/loading-region";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "../_auth/session";
import { ResetPasswordForm } from "../_auth/reset-password-form";

export const metadata: Metadata = { title: "Redefinir senha · Flomo" };

export default function RedefinirSenhaPage() {
  return (
    <main className="mx-auto flex flex-1 w-full max-w-sm flex-col justify-center gap-6 p-6">
      <Suspense
        fallback={
          <LoadingRegion>
            <Skeleton className="h-8 w-2/3" />
          </LoadingRegion>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </main>
  );
}

// Sem sessão, o link do e-mail venceu, já foi usado ou foi aberto em outro
// navegador: a tela explica e deixa pedir outro.
async function ResetPasswordContent() {
  const user = await getCurrentUser();
  if (user) return <ResetPasswordForm />;

  return (
    <div className="flex flex-col items-start gap-3" role="status">
      <Icon name="mail" className="size-8 text-primary" />
      <h1 className="text-2xl font-bold">Link vencido ou já usado</h1>
      <p className="text-sm text-muted-foreground">
        Peça um link novo e abra-o no mesmo navegador em que fez o pedido.
      </p>
      <Button render={<Link href="/esqueci-senha" />} nativeButton={false}>
        Pedir outro link
      </Button>
    </div>
  );
}
