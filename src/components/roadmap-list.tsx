import { Badge } from "@/components/ui/badge";
import {
  ROADMAP_STATUS_LABEL,
  type RoadmapItem,
  type RoadmapStatus,
} from "@/content/roadmap";
import { cn } from "cn";

const MARKER: Record<RoadmapStatus, string> = {
  planned: "bg-primary text-primary-foreground",
  exploring: "bg-muted text-foreground",
};

// A posição na lista é a ordem de implementação.
export function RoadmapList({ items }: { items: readonly RoadmapItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={cn(
            "relative grid grid-cols-[2.25rem_1fr] gap-4 pb-5 last:pb-0",
            // Linha ligando este marcador ao próximo.
            "not-last:before:absolute not-last:before:top-9 not-last:before:bottom-0 not-last:before:left-[1.0625rem] not-last:before:w-0.5 not-last:before:bg-border",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-9 items-center justify-center rounded-full text-sm font-semibold",
              MARKER[item.status],
            )}
          >
            {index + 1}
          </span>
          <div className="flex flex-col gap-1 pt-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <Badge
                variant={item.status === "planned" ? "default" : "outline"}
              >
                {ROADMAP_STATUS_LABEL[item.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
