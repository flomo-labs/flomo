import { cn } from "cn";

// Bloco cinza pulsante (parado com `prefers-reduced-motion`) para estados de carregamento; o formato vem do className.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("motion-safe:animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
