import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { RoadmapList } from "@/components/roadmap-list";
import { MarkRoadmapSeen } from "@/components/roadmap-seen";
import { roadmap } from "@/content/roadmap";
import { ROADMAP_TITLE } from "@/content/roadmap-link";

export const metadata: Metadata = {
  title: ROADMAP_TITLE,
  description: "O que está planejado para chegar ao Flomo.",
};

export default function EmBrevePage() {
  return (
    <>
      <MarkRoadmapSeen />
      <BackLink />
      <div className="flex flex-col gap-2">
        <h1 className="text-page-title">{ROADMAP_TITLE}</h1>
        <p className="text-muted-foreground">
          O que está planejado, na ordem aproximada em que deve chegar. Itens
          “planejados” já têm lugar no nosso caminho; os “em estudo” ainda podem
          mudar ou não sair.
        </p>
      </div>
      <RoadmapList items={roadmap} />
    </>
  );
}
