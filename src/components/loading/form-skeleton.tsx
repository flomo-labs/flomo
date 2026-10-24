import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de formulário (Configurações): rótulo + campo `h-8` por linha e o
// botão no fim. O texto do botão real não muda.
export function FormSkeleton({ fields = 1 }: { fields?: number }) {
  return (
    <div aria-hidden className="flex w-full flex-col gap-3">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  );
}
