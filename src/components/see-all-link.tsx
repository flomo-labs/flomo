import Link from "next/link";
import { Icon } from "@/components/icon";

// "Ver tudo ›" do cabeçalho de seção: link em magenta com a seta do desenho aprovado.
// `ariaLabel` diz a qual seção ele leva (vários "Ver tudo" na mesma tela).
export function SeeAllLink({
  href,
  label,
  ariaLabel,
}: {
  href: string;
  label: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 text-sm text-sidebar-primary transition-opacity hover:opacity-80"
    >
      {label}
      <Icon name="chevronForward" className="size-3.5" />
    </Link>
  );
}
