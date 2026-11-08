"use client";

import { ScrollHintRow } from "@/components/scroll-hint-row";
import { cn } from "@/lib/utils";

// Faixa de chips de serviços de streaming ("Todos" + serviços) no topo do
// Descobrir; rola no celular (ScrollHintRow). Só desenha: a escolha vive em
// quem usa. `value` null = "Todos".
export function ProviderStrip({
  providers,
  value,
  onChange,
  allLabel,
  ariaLabel,
}: {
  providers: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
  allLabel: string;
  ariaLabel: string;
}) {
  const options = [{ id: null, name: allLabel }, ...providers];
  return (
    <ScrollHintRow as="nav" ariaLabel={ariaLabel}>
      <ul className="flex gap-2 md:flex-wrap">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <li key={o.id ?? "all"}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(o.id)}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors md:min-h-9",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {o.name}
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollHintRow>
  );
}
