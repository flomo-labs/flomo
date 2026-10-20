import Link from "next/link";
import type { ReactNode } from "react";
import { Poster } from "@/components/catalog/poster";
import { cn } from "@/lib/utils";

const POSTER_WIDTH = {
  md: "w-16 sm:w-20",
  sm: "w-12 sm:w-14",
} as const;

// Linha de título: pôster à esquerda, conteúdo no meio e, se houver, uma ação
// à direita. Com `href`, a linha inteira é o link; sem ele, o link (se existir)
// fica dentro do `children`, o que permite ter um botão ao lado sem aninhar
// interativos.
export function PosterRow({
  href,
  posterPath,
  posterAlt,
  size = "md",
  centered = false,
  trailing,
  children,
}: {
  href?: string;
  posterPath: string | null;
  posterAlt: string;
  size?: keyof typeof POSTER_WIDTH;
  centered?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const className = cn(
    "flex gap-4 rounded-card border border-border p-3",
    centered && "items-center",
    href && "transition-colors hover:bg-muted/50",
  );
  const content = (
    <>
      <Poster
        path={posterPath}
        size="w185"
        alt={posterAlt}
        className={cn("shrink-0", POSTER_WIDTH[size])}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
      {trailing}
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
