import { cn } from "@/lib/utils";

// Indicador de carregamento do shadcn (`Spinner`): o mesmo arco do
// `Loader2Icon` do lucide que o shadcn usa, desenhado aqui como SVG para não
// trazer o lucide (o ícone do projeto é o Ionicons, que não tem um arco
// de carregamento igual). `role="status"` com nome para leitor de tela; gira
// só sem `prefers-reduced-motion`. Uso, como no shadcn: dentro de um `Button`
// desabilitado, ao lado do texto ou sozinho.
export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="status"
      aria-label="Carregando"
      className={cn("size-4 motion-safe:animate-spin", className)}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
