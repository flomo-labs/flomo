"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { FollowStatus } from "@/contracts/follow";
import { useFollowToggle, type FollowToggleLabels } from "./use-follow-toggle";

export type FollowButtonLabels = FollowToggleLabels;

// Seguir (ou Seguir de volta) / Seguindo / Solicitado no perfil de outra
// pessoa. Clicar em "Seguindo" deixa de seguir e em "Solicitado" cancela o
// pedido (lógica em `useFollowToggle`).
export function FollowButton({
  profileId,
  name,
  status,
  followsYou = false,
  labels,
}: {
  profileId: string;
  // Nome para os avisos e nomes acessíveis.
  name: string;
  status: FollowStatus | null;
  // A pessoa do perfil segue quem está logado: o botão vira "Seguir de volta".
  followsYou?: boolean;
  labels: FollowButtonLabels;
}) {
  const { current, pending, toggle, text, aria } = useFollowToggle({
    profileId,
    name,
    status,
    followsYou,
    labels,
  });

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
