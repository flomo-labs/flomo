"use client";

import { useState, useTransition } from "react";
import { StarRating, type StarRatingLabels } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rateItem, removeRating, type RatingActionResult } from "./actions";

export type RatingControlLabels = {
  stars: StarRatingLabels;
  remove: string;
  done: string;
  failed: string;
};

// Nota do usuário num filme ou episódio. Sem `canRate` (o item foi
// desmarcado) a nota continua visível e só pode ser removida.
export function RatingControl({
  target,
  value,
  canRate,
  labels,
}: {
  target: { titleId: string } | { episodeId: string };
  value: number | null;
  canRate: boolean;
  labels: RatingControlLabels;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Celular: a nota vira um botão que abre um bottom sheet.
  const [open, setOpen] = useState(false);

  function run(action: () => Promise<RatingActionResult>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) setError(result.error.message || labels.failed);
      } catch {
        setError(labels.failed);
      }
    });
  }

  const rate = canRate
    ? (halfStars: number) => run(() => rateItem({ ...target, halfStars }))
    : undefined;
  const remove = () => run(() => removeRating(target));

  return (
    <div className="flex flex-col gap-1">
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <StarRating
          value={value}
          disabled={pending}
          onChange={rate}
          labels={labels.stars}
        />
        {value !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={remove}
          >
            {labels.remove}
          </Button>
        ) : null}
      </div>
      <div className="sm:hidden">
        <Button
          type="button"
          variant="outline"
          aria-label={labels.stars.group}
          title={labels.stars.group}
          onClick={() => setOpen(true)}
          className="rounded-full px-4"
        >
          <StarRating
            value={value}
            labels={{ ...labels.stars, readOnly: undefined }}
          />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent sheet>
          <DialogHeader>
            <DialogTitle>{labels.stars.group}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <StarRating
              size="lg"
              value={value}
              disabled={pending}
              onChange={rate}
              labels={labels.stars}
            />
            {value !== null ? (
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  remove();
                }}
              >
                {labels.remove}
              </Button>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" className="rounded-full" />}
            >
              {labels.done}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
