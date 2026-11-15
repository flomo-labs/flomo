import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsSection } from "@/components/settings-section";
import { Separator } from "@/components/ui/separator";
import { FormSkeleton } from "@/components/loading/form-skeleton";
import { LoadingRegion } from "@/components/loading/loading-region";
import { isProvisionalHandle } from "@/contracts/profile";
import { requireUser } from "@/app/_auth/session";
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
import { getOwnProfile } from "@/app/_profile/queries";

export const metadata: Metadata = { title: "Perfil · Configurações · Flomo" };

export default function PerfilPage() {
  return (
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
  );
}

// Cartão "Você aparece assim" no topo, nome exibido (com bio e perfil privado)
// e @usuário. O cartão acompanha o que se digita nos dois campos. Troca do
// @usuário a qualquer momento: o antigo fica livre na hora e os links antigos
// param de funcionar. A foto continua a do Google.
async function Identity() {
  const user = await requireUser("/configuracoes/perfil");
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
