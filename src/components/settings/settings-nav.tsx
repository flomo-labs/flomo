"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { SETTINGS_GROUPS } from "@/components/settings/settings-groups";
import { cn } from "@/lib/utils";

// Grupos de Configurações (#320). Desktop: coluna à esquerda, item da tela
// atual em destaque. Celular: lista de linhas com seta, que leva à tela do
// grupo (a lista só aparece em /configuracoes). Trocar de grupo no desktop
// substitui a entrada do histórico, para o Voltar não passar por cada grupo.
export function SettingsNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav aria-label="Grupos de configurações" className={className}>
      <ul className="flex flex-col gap-2 md:gap-1">
        {SETTINGS_GROUPS.map((group) => {
          const active = pathname === group.href;
          return (
            <li key={group.href}>
              <Link
                href={group.href}
                aria-current={active ? "page" : undefined}
                onClick={(event) => {
                  if (
                    !active &&
                    window.matchMedia("(min-width: 768px)").matches &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    router.replace(group.href);
                  }
                }}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-3 rounded-card border border-border p-4 transition-colors",
                  "md:min-h-0 md:rounded-lg md:border-0 md:px-3 md:py-2 md:text-sm md:text-muted-foreground md:hover:text-foreground",
                  active && "md:bg-muted md:font-medium md:text-foreground",
                )}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium md:font-[inherit]">
                    {group.label}
                  </span>
                  <span className="text-xs text-muted-foreground md:hidden">
                    {group.description}
                  </span>
                </span>
                <Icon
                  name="chevronForward"
                  className="size-4 text-muted-foreground md:hidden"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
