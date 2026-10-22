import type { ReactNode } from "react";

// Lista vazia: cartão tracejado centralizado com a mensagem e, se houver, o botão
// que leva ao próximo passo (desenho aprovado do PR 3).
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-4 py-8 text-center">
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
