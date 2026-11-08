"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Valor do item "Todos" (sem serviço); os outros usam o id do serviço.
const ALL = "__todos__";

// Só o nome do serviço no título é o seletor: botão magenta com texto branco,
// na fonte do título (fica mais alto que a linha) e com 44px no toque.
const trigger =
  "text-section-title-lg h-auto max-w-full min-w-0 gap-2 rounded-full border-0 bg-primary px-4 py-1 text-primary-foreground hover:bg-primary/90 data-popup-open:bg-primary/90 pointer-coarse:min-h-11 [&_svg]:size-5";

// Seletor de serviço de streaming embutido no título de "Em alta" no
// Descobrir ("Em alta no [Netflix ▾]"). `value` null = "Todos". Só desenha: a
// escolha vive em quem usa.
export function ProviderSelect({
  providers,
  value,
  onChange,
  onOpen,
  allLabel,
  ariaLabel,
}: {
  providers: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string | null) => void;
  // Chamado ao abrir o menu (para pré-carregar os serviços).
  onOpen?: () => void;
  allLabel: string;
  ariaLabel: string;
}) {
  return (
    <Select
      value={value ?? ALL}
      items={[
        { value: ALL, label: allLabel },
        ...providers.map((p) => ({ value: p.id, label: p.name })),
      ]}
      onValueChange={(next) => next && onChange(next === ALL ? null : next)}
      onOpenChange={(open) => {
        if (open) onOpen?.();
      }}
    >
      <SelectTrigger aria-label={ariaLabel} className={trigger}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {providers.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
