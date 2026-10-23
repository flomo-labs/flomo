import Link from "next/link";
import type { ReactNode } from "react";
import { Poster } from "@/components/catalog/poster";

// Cartão de pôster para grades: pôster, título em até duas linhas e, se houver,
// um complemento (progresso, situação) embaixo.
export function PosterCard({
  href,
  posterPath,
  posterAlt,
  title,
  children,
}: {
  href: string;
  posterPath: string | null;
  posterAlt: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-1.5">
      <Poster
        path={posterPath}
        size="w342"
        alt={posterAlt}
        className="transition-opacity group-hover:opacity-80"
      />
      <span className="line-clamp-2 text-sm break-words leading-tight font-medium">
        {title}
      </span>
      {children}
    </Link>
  );
}
