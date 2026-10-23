import type { ReactNode } from "react";

// Cabeçalho de seção: título à esquerda e, opcionalmente, uma ação (ex.: "Ver tudo") à direita.
export function SectionHeader({
  title,
  id,
  action,
  size = "default",
}: {
  title: string;
  id?: string;
  action?: ReactNode;
  // "lg" para telas feitas só de listas (Descobrir), onde o título precisa separar as seções.
  size?: "default" | "lg";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        id={id}
        className={
          size === "lg" ? "text-section-title-lg" : "text-section-title"
        }
      >
        {title}
      </h2>
      {action}
    </div>
  );
}
