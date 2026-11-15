"use client";

import Link from "next/link";
import { ROADMAP_PATH } from "@/content/roadmap-link";
import { NotificationDot } from "@/components/notification-dot";
import { RoadmapMenuItem } from "@/components/roadmap-menu-item";
import { SiteInfoMenuItems } from "@/components/site-info-menu-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Itens com 44px de altura no celular (toque), a linha inteira clicável: o
// menu não tem folga nas bordas e os itens não têm cantos.
const ITEM = "max-md:min-h-11 max-md:rounded-none max-md:px-4";

export type PendingRequestsIndicator = {
  count: number;
  // Nome acessível do botão da foto (já com a contagem) e rótulos do item.
  triggerAria: string;
  itemLabel: string;
  countLabel: string;
};

// Contagem curta no selo do item; o texto completo vai no `sr-only`.
const MAX_BADGE = 99;

// `signOut` é a Server Action de `app/_auth/actions`, passada pelo servidor.
export function UserMenu({
  label,
  initials,
  needsHandle,
  profileHref,
  tmdbNotice,
  signOut,
  pendingRequests,
}: {
  label: string;
  initials: string;
  needsHandle: boolean;
  profileHref: string | null;
  tmdbNotice: string;
  signOut: () => Promise<void>;
  // Solicitações de seguir pendentes (#353): ponto na foto e item no menu,
  // que leva à seção de solicitações do próprio perfil.
  pendingRequests: PendingRequestsIndicator;
}) {
  const hasPending = pendingRequests.count > 0 && profileHref !== null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={hasPending ? pendingRequests.triggerAria : "Menu da conta"}
        className="grid size-11 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-auto"
      >
        <span className="relative">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {hasPending ? <NotificationDot /> : null}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 max-w-[calc(100vw-1rem)] max-md:p-0 md:w-auto md:min-w-44"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-64 truncate max-md:px-4 max-md:pt-3 max-md:pb-2">
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
        {hasPending && profileHref ? (
          <DropdownMenuItem
            render={<Link href={`${profileHref}#solicitacoes`} />}
            className={ITEM}
          >
            {pendingRequests.itemLabel}
            <Badge className="ml-auto">
              {pendingRequests.count > MAX_BADGE
                ? `${MAX_BADGE}+`
                : pendingRequests.count}
              <span className="sr-only"> ({pendingRequests.countLabel})</span>
            </Badge>
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
        <RoadmapMenuItem className={ITEM} />
        <form action={signOut}>
          <DropdownMenuItem
            nativeButton
            render={<button type="submit" />}
            className={`${ITEM} w-full text-left text-destructive focus:text-destructive data-highlighted:text-destructive`}
          >
            Sair
          </DropdownMenuItem>
        </form>
        {/* Sem rodapé no celular logado: os links e o aviso do TMDB vêm para cá. */}
        <SiteInfoMenuItems
          tmdbNotice={tmdbNotice}
          className="md:hidden"
          omitHref={ROADMAP_PATH}
          leadingSeparator
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
