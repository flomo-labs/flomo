import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "../_auth/actions";
import { safeNextPath } from "../_auth/redirect";
import { getCurrentUser } from "../_auth/session";

export const metadata: Metadata = { title: "Entrar · Flomo" };

const ERROR_MESSAGES: Record<string, string> = {
  google: "Não foi possível entrar com o Google. Tente de novo.",
};

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
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
  if (await getCurrentUser()) {
    redirect(next);
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
    </form>
  );
}
