"use client";

import { Icon } from "@/components/icon";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type StarRatingLabels = {
  // Nome do grupo, ex.: "Sua nota".
  group: string;
  // Um texto por meia estrela, de 0,5 a 5 (10 itens), ex.: "3,5 estrelas".
  options: readonly string[];
  // Só leitura: descrição da média, ex.: "Média 4,2 de 5".
  readOnly?: string;
};

const STARS = 5;

// Estrelas com meia estrela. Valor em meias estrelas (1 a 10; as médias
// podem ter casas decimais). Com `onChange` é um grupo de 10 botões de rádio
// (setas mudam a nota, Tab entra e sai); sem ele, só mostra o valor.
export function StarRating({
  value,
  onChange,
  disabled = false,
  labels,
  className,
}: {
  value: number | null;
  onChange?: (halfStars: number) => void;
  disabled?: boolean;
  labels: StarRatingLabels;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const interactive = Boolean(onChange) && !disabled;
  const shown = hover ?? value ?? 0;
  const selected = value === null ? null : Math.round(value);

  const stars = Array.from({ length: STARS }, (_, i) => {
    const fill = Math.min(Math.max(shown / 2 - i, 0), 1) * 100;
    return (
      <span key={i} className="relative inline-flex size-6">
        <Icon name="star" filled className="size-6 text-muted-foreground/30" />
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${fill}%` }}
        >
          <Icon name="star" filled className="size-6 text-primary" />
        </span>
        {onChange
          ? [i * 2 + 1, i * 2 + 2].map((half) => (
              <button
                key={half}
                ref={(node) => {
                  radios.current[half - 1] = node;
                }}
                type="button"
                role="radio"
                aria-checked={selected === half}
                aria-label={labels.options[half - 1]}
                disabled={disabled}
                tabIndex={(selected ?? 1) === half ? 0 : -1}
                className={cn(
                  "absolute inset-y-0 w-1/2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed",
                  half % 2 === 1 ? "left-0" : "right-0",
                )}
                onMouseEnter={() => interactive && setHover(half)}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  // Em tela de toque o mouseenter simulado não é desfeito;
                  // sem isto a pré-visualização ficaria no lugar da nota.
                  setHover(null);
                  onChange(half);
                }}
              />
            ))
          : null}
      </span>
    );
  });

  if (!onChange) {
    return (
      <span
        role="img"
        aria-label={labels.readOnly}
        className={cn("inline-flex", className)}
      >
        {stars}
      </span>
    );
  }

  function move(delta: number) {
    const next = Math.min(Math.max((selected ?? 0) + delta, 1), STARS * 2);
    if (next === selected) return;
    onChange?.(next);
    radios.current[next - 1]?.focus();
  }

  return (
    <span
      role="radiogroup"
      aria-label={labels.group}
      className={cn("inline-flex", className)}
      onKeyDown={(event) => {
        if (!interactive) return;
        const delta =
          event.key === "ArrowRight" || event.key === "ArrowUp"
            ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowDown"
              ? -1
              : 0;
        if (delta === 0) return;
        event.preventDefault();
        move(delta);
      }}
    >
      {stars}
    </span>
  );
}
