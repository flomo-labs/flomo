import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SettingsSection } from "@/components/settings-section";
import { BlockedList } from "@/components/block/blocked-list";
import { FormSkeleton } from "@/components/loading/form-skeleton";
import { LoadingRegion } from "@/components/loading/loading-region";
import { requireUser } from "@/app/_auth/session";
import { loadBlockedPeople } from "@/app/_block/queries";

export const metadata: Metadata = {
  title: "Privacidade · Configurações · Flomo",
};

export default function PrivacidadePage() {
  return (
    <Suspense
      fallback={
        <SettingsSection title="Pessoas bloqueadas">
          <LoadingRegion>
            <FormSkeleton fields={1} />
          </LoadingRegion>
        </SettingsSection>
      }
    >
      <BlockedPeople />
    </Suspense>
  );
}

// Pessoas que o usuário bloqueou, com Desbloquear. Só nome e @usuário.
async function BlockedPeople() {
  const user = await requireUser("/configuracoes/privacidade");
  const [people, t] = await Promise.all([
    loadBlockedPeople(user),
    getTranslations("bloqueios"),
  ]);
  return (
    <SettingsSection
      title={t("sectionTitle")}
      description={t("sectionDescription")}
    >
      <BlockedList
        people={people.map((p) => ({
          profileId: p.profileId,
          handle: p.handle,
          displayName: p.displayName,
        }))}
        labels={{
          empty: t("empty"),
          unblock: t("unblock"),
          unblockAria: t("unblockAria", { name: "{name}" }),
          unblocked: t("unblocked", { name: "{name}" }),
          failed: t("failed"),
        }}
      />
    </SettingsSection>
  );
}
