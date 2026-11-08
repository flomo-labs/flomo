import { SeeAllLink } from "@/components/see-all-link";
import { ROADMAP_PATH, ROADMAP_TITLE } from "@/content/roadmap-link";

// Fecho da tela Descobrir (#250): cartão tracejado e sem preenchimento, para
// ser uma curiosidade e não competir com as listas.
export function RoadmapTeaser() {
  return (
    <section
      aria-label={ROADMAP_TITLE}
      className="flex items-center justify-between gap-3 rounded-card border border-dashed border-border py-3 pr-6 pl-4"
    >
      <p className="font-medium">{ROADMAP_TITLE}</p>
      <SeeAllLink
        href={ROADMAP_PATH}
        label="Ver tudo"
        ariaLabel={`Ver tudo em ${ROADMAP_TITLE}`}
      />
    </section>
  );
}
