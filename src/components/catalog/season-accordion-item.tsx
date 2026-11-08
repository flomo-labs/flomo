import type { ReactNode } from "react";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";
import { SeasonAccordionToggle } from "./season-accordion-toggle";

// Uma temporada da sanfona da tela do título (#255): cabeçalho com o nome, a
// barra de progresso e as ações (marcar, menu), e o painel com os episódios,
// só quando aberta. A abertura vive na URL (`?temporada=`), então uma aberta
// por vez e o painel é renderizado no servidor.
export function SeasonAccordionItem({
  id,
  title,
  open,
  toggleHref,
  progress,
  summary,
  actions,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  // Endereço que abre (ou, se já aberta, fecha) esta temporada.
  toggleHref: string;
  // Sem progresso (visitante, especiais), `summary` mostra só o texto.
  progress: { watched: number; total: number; label: string } | null;
  summary?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const panelId = `${id}-painel`;
  return (
    <div className="rounded-card border border-border">
      <div className="flex items-start gap-2 p-2 pr-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="m-0 text-base font-medium">
            <SeasonAccordionToggle
              id={id}
              panelId={panelId}
              open={open}
              href={toggleHref}
            >
              {title}
            </SeasonAccordionToggle>
          </h3>
          {progress ? (
            <Progress
              value={progress.watched}
              max={progress.total}
              aria-valuetext={progress.label}
              className="-mt-1 flex-nowrap items-center gap-2 pl-9 [&_[data-slot=progress-track]]:w-28"
            >
              <span className="order-last text-xs text-muted-foreground tabular-nums">
                {progress.label}
              </span>
            </Progress>
          ) : summary ? (
            <p className="-mt-1 pl-9 text-xs text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={id}
          className={cn("flex flex-col gap-3 px-3 pb-3")}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
