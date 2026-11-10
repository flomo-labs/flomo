"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { acceptRequest, declineRequest } from "@/app/_follow/actions";
import { PersonList, PersonRow } from "@/components/follow/person-row";
import { Button } from "@/components/ui/button";

export type FollowRequestItem = {
  followerId: string;
  handle: string;
  displayName: string | null;
};

export type FollowRequestsLabels = {
  title: string;
  accept: string;
  decline: string;
  // Nomes acessíveis, com `{name}`.
  acceptAria: string;
  declineAria: string;
  accepted: string;
  declined: string;
  failed: string;
};

const fill = (text: string, name: string) => text.replace("{name}", () => name);

// Solicitações de seguir pendentes, só para o dono do perfil. Cada pedido
// some da lista ao ser aceito ou recusado; a lista inteira some quando acaba.
export function FollowRequests({
  requests,
  labels,
}: {
  requests: FollowRequestItem[];
  labels: FollowRequestsLabels;
}) {
  const [items, setItems] = useState(requests);
  const [pending, startTransition] = useTransition();

  function answer(item: FollowRequestItem, action: "accept" | "decline") {
    if (pending) return;
    const name = item.displayName ?? `@${item.handle}`;
    startTransition(async () => {
      try {
        const input = { followerId: item.followerId };
        const result =
          action === "accept"
            ? await acceptRequest(input)
            : await declineRequest(input);
        // Pedido que já não existe (cancelado ou respondido em outra aba)
        // também sai da lista.
        if (!result.ok && result.error.code !== "REQUEST_NOT_FOUND") {
          toast.error(result.error.message || labels.failed);
          return;
        }
        setItems((prev) =>
          prev.filter((i) => i.followerId !== item.followerId),
        );
        if (result.ok) {
          toast.success(
            fill(action === "accept" ? labels.accepted : labels.declined, name),
          );
        }
      } catch {
        toast.error(labels.failed);
      }
    });
  }

  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="follow-requests-title"
      className="flex flex-col gap-3"
    >
      <h2 id="follow-requests-title" className="text-lg font-semibold">
        {labels.title} ({items.length})
      </h2>
      <PersonList>
        {items.map((item) => {
          const name = item.displayName ?? `@${item.handle}`;
          return (
            <PersonRow key={item.followerId} person={item}>
              <Button
                size="sm"
                disabled={pending}
                aria-label={fill(labels.acceptAria, name)}
                onClick={() => answer(item, "accept")}
              >
                {labels.accept}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                aria-label={fill(labels.declineAria, name)}
                onClick={() => answer(item, "decline")}
              >
                {labels.decline}
              </Button>
            </PersonRow>
          );
        })}
      </PersonList>
    </section>
  );
}
