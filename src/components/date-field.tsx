"use client";

import { useRef } from "react";
import { Icon } from "@/components/icon";
import { cn } from "cn";

// Campo de data com o ícone de calendário sempre visível: o ícone nativo do
// navegador some no tema escuro, então ele fica invisível (cobrindo o campo
// inteiro, para qualquer toque abrir o seletor) e um botão redondo claro
// (`size-9`, fundo `muted`) é desenhado à direita. `active` põe a borda
// `primary` (escolha de data em uso). Alvo de 44px (`h-11`) no toque.
export function DateField({
  value,
  onChange,
  min,
  max,
  active = false,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  active?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cn("relative", className)}>
      <input
        ref={ref}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        // Navegadores sem o indicador nativo (Firefox) abrem pelo clique.
        onClick={() => {
          try {
            ref.current?.showPicker?.();
          } catch {
            // showPicker recusa fora de um gesto do usuário: sem problema.
          }
        }}
        className={cn(
          "h-11 w-full cursor-pointer rounded-full border-2 bg-background pl-4 pr-14 text-base [color-scheme:dark] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
          active ? "border-primary" : "border-border",
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-foreground"
      >
        <Icon name="calendar" className="size-5" />
      </span>
    </div>
  );
}
