"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useTransition } from "react";
import { cn } from "cn";
import { Icon } from "@/components/icon";

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
      className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon
        name="chevronForward"
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
          open && "rotate-90",
        )}
      />
      {children}
    </button>
  );
}
