"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { FormSkeleton } from "@/components/loading/form-skeleton";
import {
  SETTINGS_GROUPS,
  SETTINGS_INDEX_PATH,
} from "@/components/settings/settings-groups";
import { SettingsNav } from "@/components/settings/settings-nav";
import { cn } from "@/lib/utils";

// Moldura de Configurações (#320): Voltar, título e dois blocos lado a lado
// no desktop (grupos | conteúdo). No celular, /configuracoes mostra só a lista
// de grupos e cada grupo é uma tela, com Voltar para a lista. No desktop,
// /configuracoes abre direto no primeiro grupo.
export function SettingsShell({
  backToProfile,
  children,
}: {
  // Voltar da lista (e do desktop): o perfil próprio, resolvido no servidor.
  backToProfile: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isIndex = pathname === SETTINGS_INDEX_PATH;

  useEffect(() => {
    if (isIndex && window.matchMedia("(min-width: 768px)").matches) {
      router.replace(SETTINGS_GROUPS[0].href);
    }
  }, [isIndex, router]);

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className={cn(!isIndex && "max-md:hidden")}>{backToProfile}</div>
        {isIndex ? null : (
          <div className="md:hidden">
            <BackLink fallbackHref={SETTINGS_INDEX_PATH} />
          </div>
        )}
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>
      <div className="flex flex-col gap-8 md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
        <SettingsNav className={cn(!isIndex && "max-md:hidden")} />
        <div
          className={cn(
            "flex min-w-0 max-w-xl flex-col gap-8",
            isIndex && "max-md:hidden",
          )}
        >
          {isIndex ? (
            <div aria-hidden className="w-full">
              <FormSkeleton fields={3} />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
