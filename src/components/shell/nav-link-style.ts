import { cn } from "@/lib/utils";

// Estilo do link do cabeçalho; o da tela atual vira pílula.
export function navLinkClass(active: boolean) {
  return cn(
    "rounded-full px-3.5 py-2 text-sm transition-colors",
    active
      ? "bg-sidebar-primary/15 text-sidebar-primary"
      : "text-muted-foreground hover:text-foreground",
  );
}
