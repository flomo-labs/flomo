"use client";

import Link from "next/link";
import { SiteInfoMenuItems } from "@/components/site-info-menu-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Itens com 44px de altura no celular (toque).
const ITEM = "max-md:min-h-11 max-md:px-3";

// `signOut` é a Server Action de `app/_auth/actions`, passada pelo servidor.
export function UserMenu({
  label,
  initials,
  needsHandle,
  profileHref,
  tmdbNotice,
  signOut,
}: {
  label: string;
  initials: string;
  needsHandle: boolean;
  profileHref: string | null;
  tmdbNotice: string;
  signOut: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu da conta"
        className="grid size-11 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-auto"
      >
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-56 md:min-w-44"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-64 truncate">
            {label}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {needsHandle ? (
          <DropdownMenuItem render={<Link href="/cadastro" />} className={ITEM}>
            Escolher nome de usuário
          </DropdownMenuItem>
        ) : null}
        {profileHref ? (
          <DropdownMenuItem
            render={<Link href={profileHref} />}
            className={ITEM}
          >
            Meu perfil
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem render={<Link href="/biblioteca" />} className={ITEM}>
          Biblioteca
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/configuracoes" />}
          className={ITEM}
        >
          Configurações
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem
            nativeButton
            render={<button type="submit" />}
            className={ITEM}
          >
            Sair
          </DropdownMenuItem>
        </form>
        {/* Sem rodapé no celular logado: os links e o aviso do TMDB vêm para cá. */}
        <SiteInfoMenuItems
          tmdbNotice={tmdbNotice}
          className="md:hidden"
          leadingSeparator
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
