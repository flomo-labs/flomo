"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { follow, unfollow } from "@/app/_follow/actions";
import type { FollowStatus } from "@/contracts/follow";

export type FollowToggleLabels = {
  follow: string;
  // "Seguir de volta": quando a pessoa já segue o usuário logado.
  followBack: string;
  following: string;
  requested: string;
  // Nomes acessíveis, com `{name}`.
  followAria: string;
  followBackAria: string;
  unfollowAria: string;
  cancelAria: string;
  // Avisos.
  nowFollowing: string;
  nowRequested: string;
  unfollowed: string;
  cancelled: string;
  failed: string;
  // Limite de pedidos para seguir em pouco tempo (RATE_LIMITED).
  rateLimited: string;
};

export const fillName = (text: string, name: string) =>
  text.replaceAll("{name}", () => name);

// Estado e ação de Seguir / Deixar de seguir / Cancelar solicitação, usados
// pelo `FollowButton` (perfil) e pelo `PersonActionsMenu` (listas). Seguir e
// "Solicitado" (perfil privado) mudam para o estado que o banco devolveu.
// Enquanto a ação roda, `pending` é verdadeiro e cliques repetidos não fazem
// nada.
export function useFollowToggle({
  profileId,
  name,
  status,
  followsYou,
  labels,
}: {
  profileId: string;
  name: string;
  status: FollowStatus | null;
  followsYou: boolean;
  labels: FollowToggleLabels;
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
          toast.error(
            result.error.code === "RATE_LIMITED"
              ? labels.rateLimited
              : result.error.message || labels.failed,
          );
          return;
        }
        if (current === null) {
          const next = "status" in result.value ? result.value.status : null;
          setOverride({ value: next });
          toast.success(
            fillName(
              next === "requested" ? labels.nowRequested : labels.nowFollowing,
              name,
            ),
          );
        } else {
          setOverride({ value: null });
          toast.success(
            fillName(
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
      ? followsYou
        ? labels.followBack
        : labels.follow
      : current === "requested"
        ? labels.requested
        : labels.following;
  const aria = fillName(
    current === null
      ? followsYou
        ? labels.followBackAria
        : labels.followAria
      : current === "requested"
        ? labels.cancelAria
        : labels.unfollowAria,
    name,
  );

  return { current, pending, toggle, text, aria };
}
