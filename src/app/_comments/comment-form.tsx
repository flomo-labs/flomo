"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMMENT_MAX_LENGTH } from "@/contracts/comment";
import { editComment, writeComment } from "./actions";

export type CommentFormLabels = {
  body: string;
  placeholder: string;
  spoilers: string;
  // Modelo com {count} e {max}, preenchido a cada tecla.
  counter: string;
  submit: string;
  cancel: string;
  failed: string;
};

// Formulário de comentário, usado para escrever (`target.titleId`) e para
// editar (`target.commentId`). Ao dar certo, o de novo comentário se esvazia e
// `onDone` fecha o de edição.
export function CommentForm({
  target,
  initial,
  onDone,
  onCancel,
  labels,
}: {
  target: { titleId: string } | { commentId: string };
  initial?: { body: string; containsSpoilers: boolean };
  onDone?: () => void;
  onCancel?: () => void;
  labels: CommentFormLabels;
}) {
  const id = useId();
  const [body, setBody] = useState(initial?.body ?? "");
  const [containsSpoilers, setContainsSpoilers] = useState(
    initial?.containsSpoilers ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const length = [...body].length;
  const blank = !/[^\s\u0085]/.test(body);
  const tooLong = length > COMMENT_MAX_LENGTH;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await ("commentId" in target
          ? editComment({ ...target, body, containsSpoilers })
          : writeComment({ ...target, body, containsSpoilers }));
        if (!result.ok) {
          setError(result.error.message || labels.failed);
          return;
        }
        if (!initial) {
          setBody("");
          setContainsSpoilers(false);
        }
        onDone?.();
      } catch {
        setError(labels.failed);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Label className="sr-only" htmlFor={id}>
        {labels.body}
      </Label>
      <Textarea
        id={id}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={labels.placeholder}
        aria-invalid={tooLong}
        disabled={pending}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="gap-2 font-normal">
          <Checkbox
            checked={containsSpoilers}
            onCheckedChange={setContainsSpoilers}
            disabled={pending}
          />
          {labels.spoilers}
        </Label>
        <span
          className={tooLong ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {labels.counter
            .replace("{count}", String(length))
            .replace("{max}", String(COMMENT_MAX_LENGTH))}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || blank || tooLong}>
          {labels.submit}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            {labels.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
