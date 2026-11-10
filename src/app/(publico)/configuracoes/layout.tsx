import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { isProvisionalHandle } from "@/contracts/profile";
import { requireUser } from "@/app/_auth/session";
import { getOwnProfile, profilePath } from "@/app/_profile/queries";

export default function ConfiguracoesLayout({
  children,
}: LayoutProps<"/configuracoes">) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <SettingsShell
        backToProfile={
          <Suspense fallback={<BackLink />}>
            <BackToProfile />
          </Suspense>
        }
      >
        {children}
      </SettingsShell>
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
