import { LoadingRegion } from "@/components/loading/loading-region";
import { PosterRowSkeleton } from "@/components/loading/poster-row-skeleton";
import { RouteProgress } from "@/components/loading/route-progress";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback de navegação das telas públicas: barra no topo e um esqueleto
// genérico (título + linhas) até a tela de destino mostrar o dela.
export default function PublicLoading() {
  return (
    <>
      <RouteProgress />
      <LoadingRegion className="flex flex-col gap-6">
        <Skeleton className="h-9 w-48" />
        <PosterRowSkeleton className="flex max-w-reading flex-col gap-3" />
      </LoadingRegion>
    </>
  );
}
