"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookmarkIcon,
  CompassIcon,
  HouseIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { isNavItemActive, type NavItem, type NavIcon } from "./nav-items";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: HouseIcon,
  discover: CompassIcon,
  library: BookmarkIcon,
  profile: UserIcon,
};

// Barra fixa do celular (só para quem está logado). `data-bottom-nav` faz o
// globals.css reservar o espaço dela no fim da página.
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex h-16 items-stretch justify-around">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = ICONS[item.icon];
          const content = (
            <>
              <Icon className="size-6" aria-hidden />
              <span
                className={cn(
                  "text-[0.625rem]",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </>
          );
          const className = cn(
            "flex h-full min-w-14 flex-col items-center justify-center gap-0.5",
            active ? "text-sidebar-primary" : "text-muted-foreground",
          );
          return (
            <li key={item.href} className="flex flex-1">
              {item.fullNavigation ? (
                <a
                  href={item.href}
                  className={cn(className, "w-full")}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className={cn(className, "w-full")}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
