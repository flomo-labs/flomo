"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FollowStatus } from "@/contracts/follow";
import {
  RemoveFollowerDialog,
  type RemoveFollowerLabels,
} from "./remove-follower-dialog";
import {
  fillName,
  useFollowToggle,
  type FollowToggleLabels,
} from "./use-follow-toggle";

// Menu "⋮" de cada pessoa nas listas de seguidores e de seguindo: Seguir /
// Seguir de volta / Deixar de seguir / Cancelar solicitação e, na lista de
// seguidores do próprio dono, "Remover seguidor" (com confirmação).
export function PersonActionsMenu({
  profileId,
  name,
  status,
  followsYou = false,
  labels,
  menuLabel,
  removeLabels = null,
  onRemoved,
}: {
  profileId: string;
  // Nome para os avisos e nomes acessíveis.
  name: string;
  status: FollowStatus | null;
  followsYou?: boolean;
  labels: FollowToggleLabels;
  // Nome acessível do gatilho, com `{name}`.
  menuLabel: string;
  // Só na lista de seguidores do dono; sem isso não há "Remover seguidor".
  removeLabels?: RemoveFollowerLabels | null;
  onRemoved?: (deleted: boolean) => void;
}) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const { pending, toggle, aria } = useFollowToggle({
    profileId,
    name,
    status,
    followsYou,
    labels,
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={fillName(menuLabel, name)}
          disabled={pending}
          className="grid size-8 shrink-0 place-items-center rounded-full outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 pointer-coarse:size-11"
        >
          <Icon name="ellipsisVertical" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-auto min-w-56 max-w-[calc(100vw-1rem)]"
        >
          <DropdownMenuItem onClick={toggle} className="pointer-coarse:min-h-11">
            {aria}
          </DropdownMenuItem>
          {removeLabels ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setRemoveOpen(true)}
              className="pointer-coarse:min-h-11"
            >
              {removeLabels.menuItem}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {removeLabels ? (
        <RemoveFollowerDialog
          followerId={profileId}
          name={name}
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          labels={removeLabels}
          onRemoved={onRemoved}
        />
      ) : null}
    </>
  );
}
