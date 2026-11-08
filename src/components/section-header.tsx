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
  // A ação fica ao lado do título, à direita, e desce (ainda à direita) só
  // quando não cabe na linha.
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
        <div className="ml-auto min-w-0">{action}</div>
      ) : (
        action
      )}
    </div>
  );
}
