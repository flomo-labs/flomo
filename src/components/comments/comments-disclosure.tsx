"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// Botão "Comentários" de uma temporada ou de um episódio: abre o bloco logo
// abaixo e só então ele é montado (a lista de outras pessoas é pedida ao abrir,
// não uma vez por episódio ao carregar a página). `children` é o bloco.
export function CommentsDisclosure({
  label,
  ariaLabel,
  children,
}: {
  label: string;
  // Nome acessível com o alvo ("Comentários do episódio 3").
  ariaLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={ariaLabel}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon
            name="chevronForward"
            aria-hidden
            data-icon="inline-start"
            className={cn(
              "transition-transform motion-reduce:transition-none",
              open && "rotate-90",
            )}
          />
          {label}
        </Button>
      </div>
      <div id={panelId} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  );
}
