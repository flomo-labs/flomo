import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto da grade de pôsteres da Biblioteca e da prévia do perfil (mesmas
// colunas de `library-list`).
export function PosterGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul
      aria-hidden
      className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-[2/3] rounded-poster" />
        </li>
      ))}
    </ul>
  );
}
