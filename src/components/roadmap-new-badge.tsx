"use client";

import { useRoadmapHasNews } from "@/components/roadmap-seen";
import { Badge } from "@/components/ui/badge";

// Selo "Novo" do roadmap: só enquanto há novidade que a pessoa ainda não viu.
export function RoadmapNewBadge({ className }: { className?: string }) {
  if (!useRoadmapHasNews()) return null;
  return (
    <Badge className={className}>
      Novo<span className="sr-only">: há novidades</span>
    </Badge>
  );
}
