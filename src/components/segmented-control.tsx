"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Filtro em pílula: uma opção ativa por vez. A escolha vive em quem usa
// (estado da tela), este componente só desenha e avisa a troca.
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        const option = options.find((o) => o.value === next);
        if (option) onChange(option.value);
      }}
    >
      <TabsList aria-label={ariaLabel}>
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
