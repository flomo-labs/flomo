"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// `signOut` é a Server Action de `app/_auth/actions`, passada pelo servidor.
export function UserMenu({
  label,
  initials,
  signOut,
}: {
  label: string;
  initials: string;
  signOut: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Menu da conta">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuItem render={<Link href="/configuracoes" />}>
          Configurações
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem render={<button type="submit" />}>
            Sair
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
