import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsSection } from "@/components/settings-section";
import { Separator } from "@/components/ui/separator";
import { BackLink } from "@/components/back-link";
import { FormSkeleton } from "@/components/loading/form-skeleton";
import { LoadingRegion } from "@/components/loading/loading-region";
import { isProvisionalHandle } from "@/contracts/profile";
import { DeleteAccountDialog } from "@/app/_account/delete-account-dialog";
import { SignInMethods } from "@/app/_account/sign-in-methods";
import { getRequestAuth, requireUser } from "@/app/_auth/session";
import { updateHandle } from "@/app/_profile/actions";
import {
  handleFormLabels,
  profileFormLabels,
} from "@/app/_profile/form-labels";
import { HandleForm } from "@/app/_profile/handle-form";
import {
  IdentityPreviewCard,
  IdentityPreviewProvider,
} from "@/app/_profile/identity-preview";
import { ProfileForm } from "@/app/_profile/profile-form";
import { getOwnProfile, profilePath } from "@/app/_profile/queries";

export const metadata: Metadata = { title: "Configurações · Flomo" };

export default function ConfiguracoesPage({
  searchParams,
}: PageProps<"/configuracoes">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <Suspense fallback={<BackLink />}>
        <BackToProfile />
      </Suspense>
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Suspense
        fallback={
          <SettingsSection title="Perfil">
            <LoadingRegion>
              <FormSkeleton fields={3} />
            </LoadingRegion>
          </SettingsSection>
        }
      >
        <Identity />
      </Suspense>
      <SettingsSection
        title="Formas de entrar"
        description="Como você acessa o Flomo."
      >
        <Suspense
          fallback={
            <LoadingRegion>
              <FormSkeleton fields={2} />
            </LoadingRegion>
          }
        >
          <SignInMethodsSection searchParams={searchParams} />
        </Suspense>
      </SettingsSection>
      <SettingsSection
        title="Conta"
        description="Apaga seu perfil, biblioteca, notas, histórico e comentários. Não tem volta."
        destructive
        className="items-start"
      >
        <Suspense fallback={null}>
          <DeleteAccount searchParams={searchParams} />
        </Suspense>
      </SettingsSection>
      <p className="text-xs text-muted-foreground">
        Flomo {process.env.NEXT_PUBLIC_APP_VERSION} beta
      </p>
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

// Cartão "Você aparece assim" no topo, nome exibido (com bio e perfil privado)
// e @usuário. O cartão acompanha o que se digita nos dois campos. Troca do
// @usuário a qualquer momento: o antigo fica livre na hora e os links antigos
// param de funcionar. A foto continua a do Google.
async function Identity() {
  const user = await requireUser("/configuracoes");
  const profile = await getOwnProfile(user);
  const handle =
    profile && !isProvisionalHandle(profile.handle) ? profile.handle : "";
  const displayName = profile?.displayName ?? "";
  const [profileLabels, handleLabels] = await Promise.all([
    profileFormLabels(),
    handleFormLabels("changeHandle"),
  ]);
  return (
    <IdentityPreviewProvider initial={{ displayName, handle }}>
      <SettingsSection
        title="Perfil"
        description="Como outras pessoas veem e encontram você."
      >
        <IdentityPreviewCard label={profileLabels.previewTitle} />
        <ProfileForm
          defaults={{
            displayName,
            bio: profile?.bio ?? "",
            isPrivate: profile?.isPrivate ?? false,
          }}
          labels={profileLabels}
        />
        <Separator />
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{handleLabels.label}</h3>
          <HandleForm
            action={updateHandle}
            defaultHandle={handle || undefined}
            labels={handleLabels}
            submitVariant="outline"
          />
        </div>
      </SettingsSection>
    </IdentityPreviewProvider>
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
