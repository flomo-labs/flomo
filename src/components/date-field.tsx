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

// Campo de data. Com toque (celular, tablet) usa o seletor nativo do
// sistema, que no iOS e no Android já é bom; com mouse mostra o calendário
// do shadcn (`Calendar`), porque o seletor nativo do desktop destoa do app.
// Os dois valem para o mesmo estado e respeitam `min` e `max` (AAAA-MM-DD).
export function DateField({
  value,
  onChange,
  min,
  max,
  "aria-label": ariaLabel,
  calendarLabel = "Abrir calendário",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  "aria-label"?: string;
  // Rótulo do botão que abre o calendário (desktop).
  calendarLabel?: string;
  className?: string;
}) {
  const selected = parseDay(value);
  const maxDate = max ? parseDay(max) : undefined;
  const minDate = min ? parseDay(min) : undefined;
  // Mês exibido no calendário; acompanha o valor quando ele muda de fora
  // (atalhos "Ontem", "Há 1 semana").
  const [month, setMonth] = useState<Date | undefined>(selected ?? maxDate);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (selected) setMonth(selected);
  }

  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative min-w-0 max-w-full", className)}>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="block h-11 w-full min-w-0 max-w-full appearance-none rounded-full border border-border bg-background px-4 py-0 text-base leading-[2.6rem] [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:flex [&::-webkit-date-and-time-value]:h-full [&::-webkit-date-and-time-value]:min-h-6 [&::-webkit-date-and-time-value]:items-center [&::-webkit-date-and-time-value]:justify-start [&::-webkit-date-and-time-value]:text-left [color-scheme:dark] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 pointer-fine:pr-12 pointer-fine:[&::-webkit-calendar-picker-indicator]:hidden"
      />
      {/* Só com mouse: o campo continua digitável e o calendário só abre
          quando a pessoa clica no ícone. Com toque, o seletor nativo. */}
      <div className="hidden pointer-fine:block">
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
                  onChange(formatDay(date));
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
    </div>
  );
}
