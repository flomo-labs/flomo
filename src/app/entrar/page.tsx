import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "../_auth/actions";
import { safeNextPath } from "../_auth/redirect";
import { getCurrentUser } from "../_auth/session";
import { destinationAfterLogin } from "../_profile/queries";

export const metadata: Metadata = { title: "Entrar · Flomo" };

const ERROR_MESSAGES: Record<string, string> = {
  google: "Não foi possível entrar com o Google. Tente de novo.",
};

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="mx-auto flex flex-1 w-full max-w-sm flex-col justify-center gap-6 p-6">
      <BackLink />
      <h1 className="text-2xl font-bold">Entrar no Flomo</h1>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginForm({
  searchParams,
}: Pick<PageProps<"/entrar">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const user = await getCurrentUser();
  if (user) {
    redirect(await destinationAfterLogin(user, next));
  }
  const error =
    typeof params.erro === "string" ? ERROR_MESSAGES[params.erro] : undefined;

  return (
    <form action={signInWithGoogle} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit">Entrar com Google</Button>
      <p className="text-xs text-muted-foreground">
        Ao entrar, você declara ter 18 anos ou mais e concorda com os{" "}
        <Link href="/termos" className="underline underline-offset-4">
          Termos de uso
        </Link>{" "}
        e com a{" "}
        <Link href="/privacidade" className="underline underline-offset-4">
          Política de privacidade
        </Link>
        .
      </p>
    </form>
  );
}
