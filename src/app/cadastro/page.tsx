import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isProvisionalHandle } from "@/contracts/profile";
import { safeNextPath } from "../_auth/redirect";
import { requireUser } from "../_auth/session";
import { chooseHandle } from "../_profile/actions";
import { HandleForm } from "../_profile/handle-form";
import { getOwnProfile } from "../_profile/queries";

export const metadata: Metadata = {
  title: "Escolha seu nome de usuário · Flomo",
};

// Primeiro acesso: troca o handle provisório pelo definitivo.
export default function CadastroPage({ searchParams }: PageProps<"/cadastro">) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Escolha seu nome de usuário</h1>
        <p className="text-sm text-muted-foreground">
          É como as pessoas vão encontrar você no Flomo. Dá para trocar depois.
        </p>
      </div>
      <Suspense>
        <ChooseHandle searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ChooseHandle({
  searchParams,
}: Pick<PageProps<"/cadastro">, "searchParams">) {
  const next = safeNextPath((await searchParams).next);
  const user = await requireUser(`/cadastro?next=${encodeURIComponent(next)}`);
  const profile = await getOwnProfile(user);
  if (profile && !isProvisionalHandle(profile.handle)) {
    redirect(next);
  }
  return (
    <HandleForm action={chooseHandle} next={next} submitLabel="Continuar" />
  );
}
