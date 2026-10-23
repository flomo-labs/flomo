import type { ReactNode } from "react";

// Lista vazia: cartão tracejado centralizado com ilustração opcional, título em
// negrito, descrição e, se houver, o botão que leva ao próximo passo (desenho
// aprovado do PR 3).
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-4 py-8 text-center">
      {icon ? <div className="text-muted-foreground/60">{icon}</div> : null}
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{title}</p>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
