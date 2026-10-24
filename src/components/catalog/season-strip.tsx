"use client";

import { ScrollHintRow } from "@/components/scroll-hint-row";
import type { ReactNode } from "react";

// Faixa de chips de temporadas: ver ScrollHintRow (o chip ativo abre centralizado).
export function SeasonStrip({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <ScrollHintRow as="nav" ariaLabel={ariaLabel}>
      {children}
    </ScrollHintRow>
  );
}
