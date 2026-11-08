"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// Quanto rolar (px) antes de o botão aparecer: mais de uma tela e meia.
const SHOW_AFTER = 900;

// Botão flutuante "voltar ao topo" para telas muito longas (ex.: série com
// muitas temporadas e episódios). Só aparece depois de rolar `SHOW_AFTER`;
// fica acima da barra inferior do celular. Respeita `prefers-reduced-motion`.
export function ScrollToTopButton({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : true}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        })
      }
      className={cn(
        "fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 grid size-11 place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition-opacity duration-200 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none md:right-6 md:bottom-6",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Icon name="arrowUp" className="size-5" />
    </button>
  );
}
