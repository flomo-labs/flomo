"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addTitleByRef, removeFromLibrary } from "@/app/_library/actions";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import type { CatalogRef } from "@/domain/catalog/types";
import { cn } from "@/lib/utils";

export type QuickAddLabels = {
  // Nome acessível do botão, com `{title}`: "Adicionar {title} à biblioteca".
  add: string;
  // "{title} está na biblioteca".
  inLibrary: string;
  // Textos visíveis da variante com rótulo.
  addShort: string;
  inLibraryShort: string;
  // Avisos: "{title} guardado em “Quero ver”", "{title} já está na sua
  // biblioteca" e o desfazer.
  added: string;
  alreadyIn: string;
  undo: string;
  undone: string;
  failed: string;
};

const fill = (text: string, title: string) =>
  text.replace("{title}", () => title);

// Atalho para guardar um título em "Quero ver" sem abrir a página dele
// (sugestões e resultados da busca). `icon` é o "+" redondo das sugestões;
// `labeled` é o "+ Quero ver" dos resultados (só o ícone abaixo de `sm`, para
// caber em 320px). Vira "✓" (ou "✓ Na biblioteca") depois de guardar e fica
// desabilitado: o que fazer com um título já guardado continua na página dele.
// Enquanto a ação roda o botão fica desabilitado (clique repetido não faz
// nada). Sucesso: aviso verde com "Desfazer" (só quando algo foi adicionado
// agora). Erro: aviso e `role="alert"` para leitor de tela. Sem login a ação
// responde "não autenticado" e o botão leva a `/entrar`.
// `inLibrary` é o estado vindo da tela; o clique bem-sucedido o sobrepõe.
export function QuickAddButton({
  target,
  title,
  inLibrary = false,
  variant = "icon",
  labels,
  className,
}: {
  target: CatalogRef;
  title: string;
  inLibrary?: boolean;
  variant?: "icon" | "labeled";
  labels: QuickAddLabels;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // `null` = vale o que a tela informou; depois do clique, o resultado.
  const [override, setOverride] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = override ?? inLibrary;
  const toastId = `quick-add-${target.mediaType}-${target.externalId}`;

  function undo(titleId: string) {
    startTransition(async () => {
      try {
        const result = await removeFromLibrary({ titleId });
        if (!result.ok) {
          setError(labels.failed);
          return;
        }
        setOverride(false);
        toast.success(fill(labels.undone, title), { id: toastId });
      } catch {
        setError(labels.failed);
      }
    });
  }

  function add() {
    if (pending || done) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await addTitleByRef(target);
        if (!result.ok) {
          if (result.error.code === "UNAUTHENTICATED") {
            router.push("/entrar");
            return;
          }
          setError(result.error.message || labels.failed);
          toast.error(result.error.message || labels.failed, { id: toastId });
          return;
        }
        setOverride(true);
        if (result.value.added) {
          const { titleId } = result.value;
          toast.success(fill(labels.added, title), {
            id: toastId,
            action: { label: labels.undo, onClick: () => undo(titleId) },
          });
        } else {
          toast.success(fill(labels.alreadyIn, title), { id: toastId });
        }
      } catch {
        setError(labels.failed);
        toast.error(labels.failed, { id: toastId });
      }
    });
  }

  const name = fill(done ? labels.inLibrary : labels.add, title);
  const showText = variant === "labeled";
  return (
    <>
      <Button
        type="button"
        variant={done ? "default" : "outline"}
        aria-label={name}
        aria-busy={pending}
        title={name}
        disabled={pending || done}
        // Dentro de uma linha clicável (sugestão, resultado): o clique é só
        // do botão.
        onClick={(event) => {
          event.stopPropagation();
          add();
        }}
        className={cn(
          // Alvo de 44px no celular; na lista de sugestões o `icon` tem 32px
          // no desktop.
          "size-9 pointer-coarse:size-11 disabled:opacity-100",
          showText &&
            "sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3.5 sm:pointer-coarse:h-11",
          className,
        )}
      >
        {pending ? (
          <span
            aria-hidden
            className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
          />
        ) : (
          <Icon name={done ? "check" : "add"} className="size-5 sm:size-4" />
        )}
        {showText ? (
          <span className="hidden sm:inline">
            {done ? labels.inLibraryShort : labels.addShort}
          </span>
        ) : null}
      </Button>
      {error ? (
        <span role="alert" className="sr-only">
          {error}
        </span>
      ) : null}
    </>
  );
}
