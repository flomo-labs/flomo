import type { ReactNode } from "react";

// Cabeçalho de seção: título à esquerda e, opcionalmente, uma ação (ex.: "Ver tudo") à direita.
export function SectionHeader({
  title,
  id,
  action,
}: {
  title: string;
  id?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-section-title">
        {title}
      </h2>
      {action}
    </div>
  );
}
