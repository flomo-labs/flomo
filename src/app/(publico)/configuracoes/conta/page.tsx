import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsSection } from "@/components/settings-section";
import { FormSkeleton } from "@/components/loading/form-skeleton";
import { LoadingRegion } from "@/components/loading/loading-region";
import { isProvisionalHandle } from "@/contracts/profile";
import { DeleteAccountDialog } from "@/app/_account/delete-account-dialog";
import { SignInMethods } from "@/app/_account/sign-in-methods";
import { getRequestAuth, requireUser } from "@/app/_auth/session";
import { getOwnProfile } from "@/app/_profile/queries";

export const metadata: Metadata = { title: "Conta · Configurações · Flomo" };

export default function ContaPage({
  searchParams,
}: PageProps<"/configuracoes/conta">) {
  return (
    <>
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
    </>
  );
}

// Formas de entrar lidas do provedor, nunca do cache.
async function SignInMethodsSection({
  searchParams,
}: {
  searchParams: PageProps<"/configuracoes/conta">["searchParams"];
}) {
  await requireUser("/configuracoes/conta");
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
  searchParams: PageProps<"/configuracoes/conta">["searchParams"];
}) {
  const user = await requireUser("/configuracoes/conta");
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
      returnPath="/configuracoes/conta?excluir=1"
    />
  );
}
