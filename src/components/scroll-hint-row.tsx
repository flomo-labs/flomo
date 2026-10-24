"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// Faixa que rola para o lado no celular: leva o item marcado com `aria-current`
// para a vista ao montar e mostra um degradê com seta na borda direita enquanto
// há mais conteúdo (some no fim da rolagem). No desktop não rola.
export function ScrollHintRow({
  children,
  as: Tag = "div",
  ariaLabel,
}: {
  children: ReactNode;
  as?: "div" | "nav";
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hasMore, setHasMore] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setHasMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>("[aria-current]");
    if (active && el.scrollWidth > el.clientWidth) {
      el.scrollLeft =
        active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  return (
    <div className="relative -mx-4 md:mx-0">
      <Tag
        ref={ref as React.RefObject<HTMLDivElement>}
        aria-label={ariaLabel}
        onScroll={update}
        className="overflow-x-auto px-4 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] md:overflow-visible md:px-0"
      >
        {children}
      </Tag>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-end bg-gradient-to-l from-background from-35% to-transparent pr-2 text-muted-foreground transition-opacity md:hidden",
          hasMore ? "opacity-100" : "opacity-0",
        )}
      >
        <Icon name="chevronForward" className="size-5" />
      </div>
    </div>
  );
}
