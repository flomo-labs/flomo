"use client";

import type { ChangeEvent } from "react";
import {
  DayPicker,
  type ChevronProps,
  type DropdownProps,
} from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { Icon } from "@/components/icon";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "cn";

function CalendarChevron({ orientation, className }: ChevronProps) {
  return (
    <Icon
      name="chevronForward"
      className={cn(
        "size-4",
        orientation === "left" && "rotate-180",
        orientation === "up" && "-rotate-90",
        orientation === "down" && "rotate-90",
        className,
      )}
    />
  );
}

// Mês e ano do cabeçalho (`captionLayout="dropdown"`): o `Select` do app no
// lugar do `<select>` nativo, para a lista seguir o visual do resto da
// interface. O DayPicker espera um evento de `<select>`, então devolvemos um
// só com o `target.value`.
function CalendarDropdown({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const selected = options?.find((option) => option.value === value);
  return (
    <Select
      value={String(value)}
      onValueChange={(next) =>
        onChange?.({
          target: { value: next },
        } as unknown as ChangeEvent<HTMLSelectElement>)
      }
    >
      <SelectTrigger aria-label={ariaLabel} className="capitalize">
        {selected?.label}
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            disabled={option.disabled}
            className="capitalize"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Calendário do shadcn (react-day-picker) com os tokens do Flomo: dias em
// pílula, dia escolhido em `primary`, dias bloqueados (depois de `max`)
// apagados. Em português do Brasil, semana começando no domingo.
function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const day = "size-9 p-0 text-center text-sm";
  return (
    <DayPicker
      locale={ptBR}
      weekStartsOn={0}
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      className={cn("w-fit p-1", className)}
      classNames={{
        root: "w-fit",
        months: "relative flex flex-col",
        month: "flex flex-col gap-2",
        month_caption: "flex h-9 items-center justify-center px-10",
        caption_label: "text-sm font-medium capitalize",
        dropdowns: "flex items-center justify-center gap-2",
        dropdown_root: "relative",
        nav: "pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "pointer-events-auto size-9 p-0 aria-disabled:opacity-30",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "pointer-events-auto size-9 p-0 aria-disabled:opacity-30",
        ),
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "size-9 text-xs font-normal text-muted-foreground",
        weeks: "flex flex-col gap-1",
        week: "flex",
        day,
        day_button: cn(
          "size-9 cursor-pointer rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:hover:bg-transparent",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary/80",
        today: "[&>button]:font-semibold [&>button]:text-sidebar-primary",
        disabled: "opacity-30",
        outside: "opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{ Chevron: CalendarChevron, Dropdown: CalendarDropdown }}
      {...props}
    />
  );
}

export { Calendar };
