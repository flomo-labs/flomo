import Link from "next/link";
import { ROADMAP_PATH, ROADMAP_TITLE } from "@/content/roadmap-link";

export const FOOTER_LINKS = [
  { href: "/sobre", label: "Sobre" },
  { href: ROADMAP_PATH, label: ROADMAP_TITLE },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de uso" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border py-6 text-sm text-muted-foreground">
      <div className="page-container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Informações do site">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p>© Flomo</p>
      </div>
      {/* Aviso exigido pelos Termos do TMDB (seção 3): em destaque na
          aplicação inteira, não só em /sobre. */}
      <p className="page-container mt-3 text-xs">
        This website uses TMDB and the TMDB APIs but is not endorsed, certified,
        or otherwise approved by TMDB.{" "}
        <Link href="/sobre" className="underline underline-offset-4">
          Sobre
        </Link>
      </p>
    </footer>
  );
}
