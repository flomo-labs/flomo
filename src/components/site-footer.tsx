import Link from "next/link";

export const FOOTER_LINKS = [
  { href: "/sobre", label: "Sobre" },
  { href: "/em-breve", label: "Em breve" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de uso" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 sm:flex-row sm:items-center sm:justify-between">
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
      <p className="mx-auto mt-3 max-w-3xl px-6 text-xs">
        This website uses TMDB and the TMDB APIs but is not endorsed, certified,
        or otherwise approved by TMDB.{" "}
        <Link href="/sobre" className="underline underline-offset-4">
          Sobre
        </Link>
      </p>
    </footer>
  );
}
