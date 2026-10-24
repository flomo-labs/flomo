"use client";

import { SiteInfoMenuItems } from "@/components/site-info-menu-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Menu "···" da landing: leva os links do rodapé, que a landing não tem, e o
// aviso exigido pelos Termos do TMDB (seção 3), inteiro.
export function LandingMenu({
  label,
  tmdbNotice,
}: {
  label: string;
  tmdbNotice: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="grid size-9 place-items-center rounded-full bg-foreground/10 text-base leading-none font-bold tracking-widest text-foreground outline-none hover:bg-foreground/15 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        ···
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="landing-menu w-62 p-1.5"
      >
        <SiteInfoMenuItems tmdbNotice={tmdbNotice} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
