import { FormSkeleton } from "@/components/loading/form-skeleton";
import { LoadingRegion } from "@/components/loading/loading-region";
import { RouteProgress } from "@/components/loading/route-progress";

// Fallback de navegação entre grupos de Configurações: só o conteúdo, a
// moldura (Voltar, título e grupos) continua na tela.
export default function SettingsLoading() {
  return (
    <>
      <RouteProgress />
      <LoadingRegion className="flex w-full flex-col gap-6">
        <FormSkeleton fields={3} />
        <FormSkeleton fields={2} />
      </LoadingRegion>
    </>
  );
}
