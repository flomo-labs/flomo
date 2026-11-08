"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useTransition } from "react";

// Botão do cabeçalho da sanfona: `aria-expanded`/`aria-controls`, Enter e
// Espaço pelo botão nativo. Abre e fecha trocando o `?temporada=` da URL
// (`replace`, sem rolar), para o servidor trazer só o painel aberto.
export function SeasonAccordionToggle({
  id,
  panelId,
  open,
  href,
  children,
}: {
  id: string;
  panelId: string;
  open: boolean;
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      id={id}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(() => router.replace(href, { scroll: false }))
      }
      className="rounded-lg text-left outline-none before:absolute before:inset-0 before:rounded-lg focus-visible:before:ring-3 focus-visible:before:ring-ring/50"
    >
      {children}
    </button>
  );
}
