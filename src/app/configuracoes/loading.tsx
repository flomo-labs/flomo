import { FormSkeleton } from "@/components/loading/form-skeleton";
import { LoadingRegion } from "@/components/loading/loading-region";
import { RouteProgress } from "@/components/loading/route-progress";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback de navegação de Configurações: mesma coluna da tela.
export default function SettingsLoading() {
  return (
    <>
      <RouteProgress />
      <LoadingRegion className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <FormSkeleton />
        <FormSkeleton fields={3} />
      </LoadingRegion>
    </>
  );
}
