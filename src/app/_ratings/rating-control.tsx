"use client";

import { useState, useTransition } from "react";
import { StarRating, type StarRatingLabels } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { rateItem, removeRating, type RatingActionResult } from "./actions";

export type RatingControlLabels = {
  stars: StarRatingLabels;
  remove: string;
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <StarRating
          value={value}
          disabled={pending}
          onChange={
            canRate
              ? (halfStars) => run(() => rateItem({ ...target, halfStars }))
              : undefined
          }
          labels={labels.stars}
        />
        {value !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => removeRating(target))}
          >
            {labels.remove}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
