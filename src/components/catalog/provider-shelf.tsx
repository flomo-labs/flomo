import type { ReactNode } from "react";
import { SectionHeader } from "@/components/section-header";

// "Em alta no serviço X": título, a lista do serviço e tipo escolhidos e a
// atribuição. Quem escolhe serviço e tipo é o Descobrir (DiscoverBrowser).
export function ProviderShelf({
  title,
  list,
  pending,
  footer,
}: {
  // Já concordado com o gênero do serviço ("Em alta na Netflix").
  title: string;
  list: ReactNode;
  pending: boolean;
  footer: ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="em-alta-no-servico"
    >
      <SectionHeader id="em-alta-no-servico" size="lg" title={title} />
      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        {list}
      </div>
      {footer}
    </section>
  );
}
