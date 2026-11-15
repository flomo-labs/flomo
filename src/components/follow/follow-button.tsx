"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { follow, unfollow } from "@/app/_follow/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { FollowStatus } from "@/contracts/follow";

export type FollowButtonLabels = {
  follow: string;
  following: string;
  requested: string;
  // Nomes acessíveis, com `{name}`.
  followAria: string;
  unfollowAria: string;
  cancelAria: string;
  // Avisos.
  nowFollowing: string;
  nowRequested: string;
  unfollowed: string;
  cancelled: string;
  failed: string;
};

const fill = (text: string, name: string) => text.replace("{name}", () => name);

// Seguir / Seguindo / Solicitado no perfil de outra pessoa. Seguir e
// "Solicitado" (perfil privado) mudam para o estado que o banco devolveu;
// clicar em "Seguindo" deixa de seguir e em "Solicitado" cancela o pedido.
// Enquanto a ação roda o botão fica desabilitado (clique repetido não faz nada).
export function FollowButton({
  profileId,
  name,
  status,
  labels,
}: {
  profileId: string;
  // Nome para os avisos e nomes acessíveis.
  name: string;
  status: FollowStatus | null;
  labels: FollowButtonLabels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // `null` = vale o que a tela informou; depois do clique, o resultado.
  const [override, setOverride] = useState<{
    value: FollowStatus | null;
  } | null>(null);
  const current = override ? override.value : status;

  function toggle() {
    if (pending) return;
    startTransition(async () => {
      try {
        const result =
          current === null
            ? await follow({ profileId })
            : await unfollow({ profileId });
        if (!result.ok) {
          if (result.error.code === "UNAUTHENTICATED") {
            router.push("/entrar");
            return;
          }
          toast.error(result.error.message || labels.failed);
          return;
        }
        if (current === null) {
          const next = "status" in result.value ? result.value.status : null;
          setOverride({ value: next });
          toast.success(
            fill(
              next === "requested" ? labels.nowRequested : labels.nowFollowing,
              name,
            ),
          );
        } else {
          setOverride({ value: null });
          toast.success(
            fill(
              current === "requested" ? labels.cancelled : labels.unfollowed,
              name,
            ),
          );
        }
      } catch {
        toast.error(labels.failed);
      }
    });
  }

  const text =
    current === null
      ? labels.follow
      : current === "requested"
        ? labels.requested
        : labels.following;
  const aria = fill(
    current === null
      ? labels.followAria
      : current === "requested"
        ? labels.cancelAria
        : labels.unfollowAria,
    name,
  );

  return (
    <Button
      variant={current === null ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={pending}
      aria-label={aria}
      title={aria}
    >
      {pending ? <Spinner /> : null}
      {text}
    </Button>
  );
}
