import Link from "next/link";

const LINKS = [
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
            {LINKS.map((link) => (
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
    </footer>
  );
}
