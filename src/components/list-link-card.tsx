import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";

// Linha de lista que leva a outra tela (Perfil no celular, #250): cartão
// `rounded-card` com ícone, título, apoio opcional, um selo opcional (`trailing`)
// e a seta. Sem cor de destaque; a linha inteira é o link.
export function ListLinkCard({
  href,
  icon,
  title,
  description,
  trailing,
}: {
  href: string;
  icon: IconName;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-card border border-border px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <Icon name={icon} className="size-5 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        {description ? (
          <span className="text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {trailing}
      <Icon
        name="chevronForward"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
