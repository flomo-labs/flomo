"use client";

import Link from "next/link";
import { RoadmapNewBadge } from "@/components/roadmap-new-badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ROADMAP_PATH, ROADMAP_TITLE } from "@/content/roadmap-link";

// Item do menu da foto que leva ao roadmap (#250), logo depois de Configurações.
// Sem cor de destaque; o selo "Novo" só aparece enquanto há novidade não vista.
export function RoadmapMenuItem({ className }: { className?: string }) {
  return (
    <DropdownMenuItem
      render={<Link href={ROADMAP_PATH} />}
      className={className}
    >
      {ROADMAP_TITLE}
      <RoadmapNewBadge className="ml-auto" />
    </DropdownMenuItem>
  );
}
