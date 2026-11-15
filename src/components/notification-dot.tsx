import { cn } from "@/lib/utils";

// Pontinho de aviso (#353), pousado no canto de quem o contém (que precisa de
// `relative`). Só decorativo: quem o usa diz o aviso por texto (`sr-only` ou
// `aria-label`). O anel `ring-background` o separa da foto por baixo.
export function NotificationDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-0 right-0 size-2.5 rounded-full bg-primary ring-2 ring-background",
        className,
      )}
    />
  );
}
