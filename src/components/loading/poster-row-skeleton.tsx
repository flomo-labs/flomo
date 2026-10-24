import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de `PosterRow` (Seguintes, Biblioteca em lista, Busca): mesma
// borda, espaçamento e largura de pôster para o conteúdo não pular.
export function PosterRowSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul className={className ?? "flex flex-col gap-3"} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex gap-4 rounded-card border border-border p-3"
        >
          <Skeleton className="aspect-[2/3] w-16 shrink-0 rounded-poster sm:w-20" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="hidden h-4 w-full md:block" />
          </div>
        </li>
      ))}
    </ul>
  );
}
