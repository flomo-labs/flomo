import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { isProvisionalHandle } from "@/contracts/profile";
import { requireUser } from "../_auth/session";
import { updateHandle } from "../_profile/actions";
import { HandleForm } from "../_profile/handle-form";
import { getOwnProfile, getOwnStartScreen } from "../_profile/queries";
import { StartScreenForm } from "../_profile/start-screen-form";

export const metadata: Metadata = { title: "Configurações · Flomo" };

export default function ConfiguracoesPage() {
  return (
    <main className="mx-auto flex flex-1 w-full max-w-sm flex-col justify-center gap-6 p-6">
      <BackLink />
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Suspense>
        <ChangeHandle />
      </Suspense>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Tela inicial</h2>
        <p className="text-sm text-muted-foreground">
          Onde você começa ao entrar e o que o menu Início abre. O logo do Flomo
          sempre leva à Home.
        </p>
        <Suspense>
          <ChangeStartScreen />
        </Suspense>
      </section>
    </main>
  );
}

// Troca do handle a qualquer momento. O antigo fica livre na hora.
async function ChangeHandle() {
  const user = await requireUser("/configuracoes");
  const profile = await getOwnProfile(user);
  const current =
    profile && !isProvisionalHandle(profile.handle)
      ? profile.handle
      : undefined;
  return (
    <HandleForm
      action={updateHandle}
      defaultHandle={current}
      submitLabel="Salvar"
    />
  );
}

async function ChangeStartScreen() {
  const user = await requireUser("/configuracoes");
  return <StartScreenForm current={await getOwnStartScreen(user)} />;
}
