"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// `signOut` é a Server Action de `app/_auth/actions`, passada pelo servidor.
export function UserMenu({
  label,
  initials,
  needsHandle,
  profileHref,
  signOut,
}: {
  label: string;
  initials: string;
  needsHandle: boolean;
  profileHref: string | null;
  signOut: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu da conta"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-auto min-w-44"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {needsHandle ? (
          <DropdownMenuItem render={<Link href="/cadastro" />}>
            Escolher nome de usuário
          </DropdownMenuItem>
        ) : null}
        {profileHref ? (
          <DropdownMenuItem render={<Link href={profileHref} />}>
            Meu perfil
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem render={<Link href="/biblioteca" />}>
          Biblioteca
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/configuracoes" />}>
          Configurações
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem nativeButton render={<button type="submit" />}>
            Sair
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
