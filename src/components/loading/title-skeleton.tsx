import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto da tela do título: cabeçalho (pôster 2:3 + texto), sinopse e faixa
// de temporadas com a lista de episódios.
export function TitleSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-8">
      <div className="flex gap-4 sm:gap-6">
        <Skeleton className="aspect-[2/3] w-24 shrink-0 rounded-poster sm:w-44" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <EpisodesSkeleton />
    </div>
  );
}

// Faixa de temporadas seguida das linhas de episódio.
export function EpisodesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton className="h-9 w-full max-w-sm rounded-full" />
      <EpisodeListSkeleton count={count} />
    </div>
  );
}

// Só as linhas de episódio (a faixa de temporadas já está na tela).
export function EpisodeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-hidden className="flex max-w-reading flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex flex-col gap-2 rounded-card border border-border p-4"
        >
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </li>
      ))}
    </ul>
  );
}
