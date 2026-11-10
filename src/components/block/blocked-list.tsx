"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { unblock } from "@/app/_block/actions";
import { profileInitials } from "@/app/_profile/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type BlockedListItem = {
  profileId: string;
  handle: string;
  displayName: string | null;
};

export type BlockedListLabels = {
  empty: string;
  unblock: string;
  // Nome acessível ({name}).
  unblockAria: string;
  // Aviso ({name}).
  unblocked: string;
  failed: string;
};

const fill = (text: string, name: string) => text.replace("{name}", () => name);

// Lista de pessoas bloqueadas, em Configurações, com Desbloquear em cada uma.
// Só nome, handle e foto: nada mais do perfil bloqueado aparece. A pessoa some
// da lista ao ser desbloqueada.
export function BlockedList({
  people,
  labels,
}: {
  people: BlockedListItem[];
  labels: BlockedListLabels;
}) {
  const [items, setItems] = useState(people);
  const [pending, startTransition] = useTransition();

  function remove(item: BlockedListItem) {
    if (pending) return;
    const name = item.displayName ?? `@${item.handle}`;
    startTransition(async () => {
      try {
        const result = await unblock({ profileId: item.profileId });
        if (!result.ok) {
          toast.error(result.error.message || labels.failed);
          return;
        }
        setItems((prev) => prev.filter((i) => i.profileId !== item.profileId));
        toast.success(fill(labels.unblocked, name));
      } catch {
        toast.error(labels.failed);
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{labels.empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const name = item.displayName ?? `@${item.handle}`;
        return (
          <li
            key={item.profileId}
            className="flex flex-wrap items-center gap-3 rounded-card border border-border p-3"
          >
            <Link
              href={`/@${item.handle}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar>
                <AvatarFallback>
                  {profileInitials(item.displayName, item.handle)}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="font-medium break-words">{name}</span>
                <span className="text-sm text-muted-foreground break-words">
                  @{item.handle}
                </span>
              </span>
            </Link>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              aria-label={fill(labels.unblockAria, name)}
              onClick={() => remove(item)}
            >
              {labels.unblock}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
