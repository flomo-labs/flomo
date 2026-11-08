"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  isoToMasked,
  maskDateInput,
  parseMaskedDate,
} from "@/lib/watch-date-shortcuts";
import { cn } from "cn";

// AAAA-MM-DD ↔ Date local ao meio-dia, para o fuso não mudar o dia.
function parseDay(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function formatDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Campo de data igual no celular e no desktop: texto digitável no formato
// dd/mm/aaaa (teclado numérico, barras automáticas) e, à direita, o ícone de
// calendário que abre o `Calendar` do shadcn num `Popover`, só quando a
// pessoa clica. O seletor nativo não é usado: no desktop destoa do app e no
// iOS não deixa digitar. `value`, `min` e `max` são AAAA-MM-DD; `value` vira
// "" enquanto o texto está incompleto ou fora de `min`/`max`.
export function DateField({
  value,
  onChange,
  min,
  max,
  "aria-label": ariaLabel,
  calendarLabel = "Abrir calendário",
  placeholder = "dd/mm/aaaa",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  "aria-label"?: string;
  // Rótulo do botão que abre o calendário.
  calendarLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const selected = parseDay(value);
  const maxDate = max ? parseDay(max) : undefined;
  const minDate = min ? parseDay(min) : undefined;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(isoToMasked(value));
  // Mês exibido no calendário; acompanha o valor.
  const [month, setMonth] = useState<Date | undefined>(selected ?? maxDate);

  // Valor trocado de fora (atalhos "Ontem", "Há 1 semana"): o texto segue.
  if (value !== "" && value !== parseMaskedDate(text)) {
    setText(isoToMasked(value));
    if (selected) setMonth(selected);
  }

  const parsed = parseMaskedDate(text);
  const outOfRange =
    parsed !== "" && ((max && parsed > max) || (min && parsed < min));
  const invalid = text.length === 10 && (parsed === "" || Boolean(outOfRange));

  return (
    <div className={cn("relative min-w-0 max-w-full", className)}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const next = maskDateInput(e.target.value);
          setText(next);
          const iso = parseMaskedDate(next);
          onChange(
            iso && (!max || iso <= max) && (!min || iso >= min) ? iso : "",
          );
        }}
        className="block h-11 w-full min-w-0 max-w-full rounded-full border border-border bg-background pl-4 pr-12 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={calendarLabel}
              title={calendarLabel}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            />
          }
        >
          <Icon name="calendar" className="size-5" />
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            required
            selected={selected}
            onSelect={(date) => {
              if (date) {
                const iso = formatDay(date);
                setText(isoToMasked(iso));
                onChange(iso);
                setOpen(false);
              }
            }}
            month={month}
            onMonthChange={setMonth}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={[
              ...(maxDate ? [{ after: maxDate }] : []),
              ...(minDate ? [{ before: minDate }] : []),
            ]}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
