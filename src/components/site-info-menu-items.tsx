"use client";

import Link from "next/link";
import { FOOTER_LINKS } from "@/components/site-footer";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Links do rodapé e aviso do TMDB (Termos do TMDB, seção 3), inteiro, como itens
// de menu: no menu "···" da landing e no menu da foto no celular, onde não há
// rodapé. `className` vai em cada item e separador (ex.: `md:hidden`).
export function SiteInfoMenuItems({
  tmdbNotice,
  className,
  leadingSeparator = false,
}: {
  tmdbNotice: string;
  className?: string;
  leadingSeparator?: boolean;
}) {
  return (
    <>
      {leadingSeparator ? (
        <DropdownMenuSeparator className={className} />
      ) : null}
      {FOOTER_LINKS.map((link) => (
        <DropdownMenuItem
          key={link.href}
          render={<Link href={link.href} />}
          className={cn("px-3 py-2", className)}
        >
          {link.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator className={className} />
      <DropdownMenuItem
        render={<Link href="/sobre" />}
        className={cn(
          "flex-col items-start gap-1 px-3 py-2 text-xs leading-snug text-muted-foreground",
          className,
        )}
      >
        <span className="font-semibold text-tmdb">TMDB</span>
        {tmdbNotice}
      </DropdownMenuItem>
    </>
  );
}
