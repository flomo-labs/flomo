import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { FormSkeleton } from "@/components/loading/form-skeleton";
import { LoadingRegion } from "@/components/loading/loading-region";
import { isProvisionalHandle } from "@/contracts/profile";
import { DeleteAccountDialog } from "@/app/_account/delete-account-dialog";
import { SignInMethods } from "@/app/_account/sign-in-methods";
import { getRequestAuth, requireUser } from "@/app/_auth/session";
import { updateHandle } from "@/app/_profile/actions";
import { handleFormLabels, profileFormLabels } from "@/app/_profile/form-labels";
import { HandleForm } from "@/app/_profile/handle-form";
import { ProfileForm } from "@/app/_profile/profile-form";
import { getOwnProfile, profilePath } from "@/app/_profile/queries";

export const metadata: Metadata = { title: "Configurações · Flomo" };

export default function ConfiguracoesPage({
  searchParams,
}: PageProps<"/configuracoes">) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <Suspense fallback={<BackLink />}>
        <BackToProfile />
      </Suspense>
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Suspense
        fallback={
          <LoadingRegion>
            <FormSkeleton />
          </LoadingRegion>
        }
      >
        <ChangeHandle />
      </Suspense>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Perfil</h2>
        <Suspense
          fallback={
            <LoadingRegion>
              <FormSkeleton fields={3} />
            </LoadingRegion>
          }
        >
          <EditProfile />
        </Suspense>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Formas de entrar</h2>
        <Suspense
          fallback={
            <LoadingRegion>
              <FormSkeleton fields={2} />
            </LoadingRegion>
          }
        >
          <SignInMethodsSection searchParams={searchParams} />
        </Suspense>
      </section>
      <section className="flex flex-col items-start gap-2">
        <h2 className="text-lg font-semibold">Conta</h2>
        <p className="text-sm text-muted-foreground">
          Apaga seu perfil, biblioteca, notas, histórico e comentários. Não tem
          volta.
        </p>
        <Suspense fallback={null}>
          <DeleteAccount searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
  );
}

// Chega-se aqui pelo "Editar perfil": sem tela anterior, Voltar leva ao
// perfil próprio (ou ao início, se o handle ainda é provisório).
async function BackToProfile() {
  const user = await requireUser("/configuracoes");
  const profile = await getOwnProfile(user);
  const href =
    profile && !isProvisionalHandle(profile.handle)
      ? profilePath(profile.handle)
      : "/";
  return <BackLink fallbackHref={href} />;
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
      labels={await handleFormLabels("save")}
    />
  );
}

// Nome de exibição, bio e perfil privado; a foto continua a do Google.
async function EditProfile() {
  const user = await requireUser("/configuracoes");
  const profile = await getOwnProfile(user);
  return (
    <ProfileForm
      defaults={{
        displayName: profile?.displayName ?? "",
        bio: profile?.bio ?? "",
        isPrivate: profile?.isPrivate ?? false,
      }}
      labels={await profileFormLabels()}
    />
  );
}

// Formas de entrar lidas do provedor, nunca do cache.
async function SignInMethodsSection({
  searchParams,
}: {
  searchParams: PageProps<"/configuracoes">["searchParams"];
}) {
  await requireUser("/configuracoes");
  const auth = await getRequestAuth();
  const [methods, { erro }] = await Promise.all([
    auth.signInMethods().list(),
    searchParams,
  ]);
  return <SignInMethods methods={methods} linkError={erro === "vinculo"} />;
}

// Digitar o @handle confirma a exclusão; sem handle definido, "excluir".
async function DeleteAccount({
  searchParams,
}: {
  searchParams: PageProps<"/configuracoes">["searchParams"];
}) {
  const user = await requireUser("/configuracoes");
  const profile = await getOwnProfile(user);
  const confirmWord =
    profile && !isProvisionalHandle(profile.handle)
      ? profile.handle
      : "excluir";
  const auth = await getRequestAuth();
  const [methods, { excluir }] = await Promise.all([
    auth.signInMethods().list(),
    searchParams,
  ]);
  return (
    <DeleteAccountDialog
      methods={methods}
      confirmWord={confirmWord}
      defaultOpen={excluir === "1"}
      returnPath="/configuracoes?excluir=1"
    />
  );
}
