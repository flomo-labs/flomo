"use client";

import Link from "next/link";
import { FOOTER_LINKS } from "@/components/site-footer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
        {FOOTER_LINKS.map((link) => (
          <DropdownMenuItem
            key={link.href}
            render={<Link href={link.href} />}
            className="px-3 py-2"
          >
            {link.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/sobre" />}
          className="flex-col items-start gap-1 px-3 py-2 text-xs leading-snug text-muted-foreground"
        >
          <span className="font-semibold text-tmdb">TMDB</span>
          {tmdbNotice}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
