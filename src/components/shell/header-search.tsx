import { Icon } from "@/components/icon";
import { Input } from "@/components/ui/input";

// Campo do cabeçalho do desktop: envia para /buscar (funciona sem JavaScript).
export function HeaderSearch() {
  return (
    <form
      action="/buscar"
      role="search"
      className="relative hidden w-64 md:block"
    >
      <Icon
        name="search"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        name="q"
        aria-label="Buscar títulos"
        placeholder="Buscar títulos"
        autoComplete="off"
        className="h-9 rounded-full pl-9"
      />
    </form>
  );
}
