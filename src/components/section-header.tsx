import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// Cabeçalho de seção: título à esquerda e, opcionalmente, uma ação (ex.: "Ver tudo") à direita.
export function SectionHeader({
  title,
  id,
  action,
  size = "default",
  wrap = false,
}: {
  // Texto, ou um título com controle embutido (ex.: seletor de serviço).
  title: ReactNode;
  id?: string;
  action?: ReactNode;
  // "lg" para telas feitas só de listas (Descobrir), onde o título precisa separar as seções.
  size?: "default" | "lg";
  // No celular, a ação fica sempre na linha de baixo, à esquerda (como os
  // filtros da Biblioteca e do Seguintes); no desktop, ao lado do título, à
  // direita, e desce (ainda à direita) só quando não cabe.
  wrap?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        wrap && "flex-wrap",
      )}
    >
      <h2
        id={id}
        className={
          size === "lg" ? "text-section-title-lg" : "text-section-title"
        }
      >
        {title}
      </h2>
      {wrap && action ? (
        // `min-w-0`: sem ele o item de flex cresce até a largura da ação, e
        // uma ação que rola (ScrollHintRow) passaria da tela em vez de rolar.
        <div className="min-w-0 max-md:basis-full md:ml-auto">{action}</div>
      ) : (
        action
      )}
    </div>
  );
}
