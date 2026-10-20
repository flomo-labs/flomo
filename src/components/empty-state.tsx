import type { ReactNode } from "react";

// Lista vazia: a mensagem e, se houver, o botão que leva ao próximo passo.
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
