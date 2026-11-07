"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarkWatchDateInput } from "@/contracts/library";
import {
  toWatchDateInput,
  WatchDateChoice,
  type WatchDateChoiceKind,
} from "./watch-date-choice";
import type { WatchControlLabels } from "./watch-control";

type WatchRecord = { eventId: string; dateLabel: string };
type View =
  | { name: "list" }
  | { name: "edit"; eventId: string }
  | { name: "delete"; eventId: string };

// Todos os registros de um episódio ou filme visto, do mais recente ao mais
// antigo. No mesmo diálogo, o conteúdo troca para editar a data de um
// registro ou confirmar que ele será apagado, cada um com "Voltar".
export function WatchRecordsDialog({
  open,
  onOpenChange,
  records,
  today,
  pending,
  labels,
  onSetDate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: WatchRecord[];
  today: string;
  pending: boolean;
  labels: WatchControlLabels;
  onSetDate: (eventId: string, when: MarkWatchDateInput) => void;
  onDelete: (eventId: string) => void;
}) {
  const [view, setView] = useState<View>({ name: "list" });
  const [choice, setChoice] = useState<WatchDateChoiceKind>("day");
  const [day, setDay] = useState(today);

  const back = () => setView({ name: "list" });
  const edit = (eventId: string) => {
    setChoice("day");
    setDay(today);
    setView({ name: "edit", eventId });
  };
  const finish = (eventId: string) => {
    onSetDate(eventId, toWatchDateInput(choice, day));
    back();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) back();
      }}
    >
      <DialogContent>
        {view.name === "list" ? (
          <>
            <DialogHeader>
              <DialogTitle>{labels.history}</DialogTitle>
            </DialogHeader>
            <ul className="flex flex-col gap-2">
              {records.map((record) => (
                <li
                  key={record.eventId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 break-words">
                    {record.dateLabel}
                  </span>
                  <span className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={labels.editRecord}
                      title={labels.editRecord}
                      disabled={pending}
                      onClick={() => edit(record.eventId)}
                      className="size-8 pointer-coarse:size-11"
                    >
                      <Icon
                        name="create"
                        className="size-4 pointer-coarse:size-5"
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={labels.deleteRecord}
                      title={labels.deleteRecord}
                      disabled={pending}
                      onClick={() =>
                        setView({ name: "delete", eventId: record.eventId })
                      }
                      className="size-8 pointer-coarse:size-11"
                    >
                      <Icon
                        name="trash"
                        className="size-4 pointer-coarse:size-5"
                      />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : view.name === "edit" ? (
          <>
            <DialogHeader>
              <DialogTitle>{labels.editRecord}</DialogTitle>
            </DialogHeader>
            <WatchDateChoice
              kind={choice}
              day={day}
              today={today}
              labels={labels}
              onKindChange={setChoice}
              onDayChange={setDay}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={back}
              >
                {labels.back}
              </Button>
              <Button
                type="button"
                className="rounded-full"
                disabled={pending || (choice === "day" && !day)}
                onClick={() => finish(view.eventId)}
              >
                {labels.done}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{labels.deleteRecord}</DialogTitle>
              <DialogDescription>
                {labels.deleteRecordConfirm}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={back}
              >
                {labels.back}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                disabled={pending}
                onClick={() => {
                  onDelete(view.eventId);
                  back();
                }}
              >
                {labels.deleteRecord}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
