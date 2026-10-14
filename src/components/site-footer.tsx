import Image from "next/image";
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
        <div className="flex items-center gap-4">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TMDB"
          >
            <Image
              src="/tmdb/alt-short-blue.svg"
              alt="Logo do TMDB"
              width={123}
              height={16}
              unoptimized
            />
          </a>
          <p>© Flomo</p>
        </div>
      </div>
    </footer>
  );
}
