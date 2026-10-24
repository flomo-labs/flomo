import { Skeleton } from "@/components/ui/skeleton";
import { PosterGridSkeleton } from "./poster-grid-skeleton";

// Esqueleto do perfil: avatar + nome + handle, números e prateleira.
export function ProfileSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-8">
      <div className="flex items-start gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-card" />
        ))}
      </div>
      <PosterGridSkeleton count={5} />
    </div>
  );
}
