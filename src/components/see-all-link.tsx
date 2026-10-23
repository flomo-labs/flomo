import Link from "next/link";
import { Icon } from "@/components/icon";

// "Ver tudo ›" do cabeçalho de seção: link em magenta com a seta do desenho aprovado.
// A seta do Ionicons tem folga interna, por isso o padding direito é menor que o esquerdo.
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
      className="-mr-3 inline-flex items-center gap-0.5 rounded-full py-1.5 pr-1.5 pl-3 text-sm leading-none text-sidebar-primary transition-colors hover:bg-sidebar-primary/15"
    >
      {label}
      <Icon name="chevronForward" className="size-3.5" />
    </Link>
  );
}
