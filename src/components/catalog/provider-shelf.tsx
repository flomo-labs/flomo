import type { ReactNode } from "react";

// "Em alta no serviço X": cabeçalho (título com o seletor de serviço e o
// filtro de tipo), a lista do serviço e tipo escolhidos e a atribuição. Quem
// escolhe serviço e tipo é o Descobrir (DiscoverBrowser).
export function ProviderShelf({
  header,
  list,
  pending,
  footer,
}: {
  header: ReactNode;
  list: ReactNode;
  pending: boolean;
  footer: ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="em-alta-no-servico"
    >
      {header}
      <div aria-busy={pending} className={pending ? "opacity-60" : undefined}>
        {list}
      </div>
      {footer}
    </section>
  );
}
