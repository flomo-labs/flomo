"use client";

import { Button } from "@/components/ui/button";
import type { MarkWatchDateInput } from "@/contracts/library";

// O que o usuário escolheu como data: agora, sem data, a data de exibição
// ou lançamento do catálogo, ou um dia.
export type WatchDateChoiceKind = "now" | "unknown" | "airDate" | "day";

export type WatchDateChoiceLabels = {
  today: string;
  noDate: string;
  pickDate: string;
  // Texto da opção "data do catálogo". Ausente = a opção não aparece (sem
  // data de exibição ou lançamento no catálogo).
  airDate?: string;
};

// Converte a escolha no que os casos de uso recebem.
export function toWatchDateInput(
  kind: WatchDateChoiceKind,
  day: string,
): MarkWatchDateInput {
  return kind === "day"
    ? { kind: "date", precision: "day", value: day }
    : { kind };
}

// Opções de data de assistido, em botões de uma escolha só (`aria-pressed`)
// e o seletor de dia. Usado no diálogo de editar um registro e no de marcar
// a temporada inteira, para as duas telas oferecerem o mesmo.
export function WatchDateChoice({
  kind,
  day,
  today,
  labels,
  onKindChange,
  onDayChange,
}: {
  kind: WatchDateChoiceKind;
  day: string;
  // AAAA-MM-DD de hoje, limite do seletor.
  today: string;
  labels: WatchDateChoiceLabels;
  onKindChange: (kind: WatchDateChoiceKind) => void;
  onDayChange: (day: string) => void;
}) {
  const options: { kind: WatchDateChoiceKind; label: string }[] = [
    { kind: "now", label: labels.today },
    ...(labels.airDate
      ? [{ kind: "airDate" as const, label: labels.airDate }]
      : []),
    { kind: "unknown", label: labels.noDate },
  ];
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <Button
          key={option.kind}
          type="button"
          variant={kind === option.kind ? "default" : "outline"}
          aria-pressed={kind === option.kind}
          className="h-auto min-h-8 rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11"
          onClick={() => onKindChange(option.kind)}
        >
          {option.label}
        </Button>
      ))}
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{labels.pickDate}</span>
        <input
          type="date"
          value={day}
          max={today}
          min="1900-01-01"
          onChange={(e) => {
            onDayChange(e.target.value);
            onKindChange("day");
          }}
          className="h-11 rounded-full border border-border bg-background px-4 text-base"
        />
      </label>
    </div>
  );
}
