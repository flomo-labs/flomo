import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { RoadmapList } from "@/components/roadmap-list";
import { roadmap } from "@/content/roadmap";

export const metadata: Metadata = {
  title: "Em breve · Flomo",
  description: "O que vem por aí no Flomo.",
};

export default function EmBrevePage() {
  return (
    <>
      <BackLink />
      <div className="flex flex-col gap-2">
        <h1 className="text-page-title">Em breve</h1>
        <p className="text-muted-foreground">
          O que vem por aí no Flomo, na ordem aproximada em que deve chegar.
          Itens “planejados” já têm lugar no nosso caminho; os “em estudo” ainda
          podem mudar ou não sair.
        </p>
      </div>
      <RoadmapList items={roadmap} />
    </>
  );
}
