"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarkWatchDateInput } from "@/contracts/library";

export type WatchDateChoiceLabels = {
  today: string;
  noDate: string;
  // "Outro dia" / "Escolher data": abre a tela do seletor de dia.
  pickDate: string;
  // Texto da opção "data do catálogo". Ausente = a opção não aparece (sem
  // data de exibição ou lançamento no catálogo).
  airDate?: string;
  // Rodapé: "Voltar" da tela do seletor e "Concluir" que grava o dia.
  back: string;
  done: string;
};

// Conteúdo de um diálogo que pergunta "quando foi?". Duas telas no mesmo
// diálogo: (1) as opções, todas botões que agem na hora, sem "Concluir":
// Hoje (a sugestão, em destaque), a data do catálogo (se houver), Sem data
// e Escolher data; (2) só se escolheu "Escolher data", o seletor de dia com
// "Voltar" e "Concluir". Usado ao editar um registro e ao marcar a
// temporada inteira, para as duas telas oferecerem o mesmo.
// Deve ficar dentro de um `DialogContent`: ao fechar, o estado se perde e
// a próxima abertura começa nas opções.
export function WatchDateChoice({
  title,
  description,
  today,
  pending,
  labels,
  cancelLabel,
  onCancel,
  onChoose,
}: {
  title: ReactNode;
  description?: ReactNode;
  // AAAA-MM-DD de hoje, limite do seletor.
  today: string;
  pending: boolean;
  labels: WatchDateChoiceLabels;
  // Botão de sair das opções ("Voltar" ou "Cancelar").
  cancelLabel: string;
  onCancel: () => void;
  onChoose: (when: MarkWatchDateInput) => void;
}) {
  const [view, setView] = useState<"options" | "day">("options");
  const [day, setDay] = useState(today);

  if (view === "day") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{labels.pickDate}</DialogTitle>
        </DialogHeader>
        <input
          type="date"
          aria-label={labels.pickDate}
          value={day}
          max={today}
          min="1900-01-01"
          onChange={(e) => setDay(e.target.value)}
          className="h-11 rounded-full border border-border bg-background px-4 text-base"
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setView("options")}
          >
            {labels.back}
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={pending || !day}
            onClick={() =>
              onChoose({ kind: "date", precision: "day", value: day })
            }
          >
            {labels.done}
          </Button>
        </DialogFooter>
      </>
    );
  }

  const optionClass =
    "h-auto min-h-8 rounded-full py-1.5 whitespace-normal pointer-coarse:min-h-11";
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          disabled={pending}
          className={optionClass}
          onClick={() => onChoose({ kind: "now" })}
        >
          {labels.today}
        </Button>
        {labels.airDate ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className={optionClass}
            onClick={() => onChoose({ kind: "airDate" })}
          >
            {labels.airDate}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className={optionClass}
          onClick={() => onChoose({ kind: "unknown" })}
        >
          {labels.noDate}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className={optionClass}
          onClick={() => setView("day")}
        >
          {labels.pickDate}
          <Icon name="chevronForward" className="size-4" />
        </Button>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
