"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Option<T extends string> = {
  value: T;
  label: string;
  // Opção desabilitada; com `hint`, uma dica explica o motivo.
  disabled?: boolean;
  hint?: string;
};

// Filtro em pílula: trilha cinza arredondada, opção ativa preenchida em
// magenta com texto branco. A pílula magenta é um indicador que desliza até a
// opção escolhida (sem animação com `prefers-reduced-motion`). A escolha vive
// em quem usa (estado da tela), este componente só desenha e avisa a troca.
// Com `compactOnMobile`, abaixo de `md` vira um `Select` com as mesmas opções
// (para filtros com muitas opções, que não cabem na largura do celular).
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  compactOnMobile = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  ariaLabel: string;
  compactOnMobile?: boolean;
}) {
  const pills = (
    <Tabs
      className={compactOnMobile ? "max-md:hidden" : undefined}
      value={value}
      onValueChange={(next) => {
        const option = options.find((o) => o.value === next);
        if (option) onChange(option.value);
      }}
    >
      <TabsList aria-label={ariaLabel} className="relative rounded-full">
        {/* Posição e largura da opção ativa vêm da Base UI em variáveis CSS. */}
        <TabsPrimitive.Indicator
          renderBeforeHydration
          className="absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) rounded-full bg-primary transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
        />
        {options.map((o) => {
          const trigger = (
            <TabsTrigger
              key={o.value}
              value={o.value}
              disabled={o.disabled}
              className="z-10 rounded-full px-3.5 data-active:bg-transparent data-active:text-primary-foreground data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent dark:data-active:text-primary-foreground"
            >
              {o.label}
            </TabsTrigger>
          );
          // Um elemento desabilitado não recebe o mouse: o tooltip fica no
          // invólucro. Sem atraso, para a dica não passar despercebida.
          return o.hint ? (
            <Tooltip key={o.value}>
              <TooltipTrigger delay={0} render={<span tabIndex={0} />}>
                {trigger}
              </TooltipTrigger>
              <TooltipContent>{o.hint}</TooltipContent>
            </Tooltip>
          ) : (
            trigger
          );
        })}
      </TabsList>
    </Tabs>
  );

  if (!compactOnMobile) return pills;

  return (
    <>
      <Select
        value={value}
        items={options.map((o) => ({ value: o.value, label: o.label }))}
        onValueChange={(next) => {
          const option = options.find((o) => o.value === next);
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className="h-9 gap-2 rounded-full border-0 bg-muted px-4 text-sm font-medium md:hidden"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pills}
    </>
  );
}
