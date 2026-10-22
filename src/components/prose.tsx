import { Separator } from "@/components/ui/separator";
import { cn } from "cn";

// Tipografia dos textos longos (páginas legais e Sobre).
export function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex max-w-reading flex-col gap-6 leading-relaxed",
        "[&_a]:underline [&_a]:underline-offset-4",
        "[&_h2]:text-section-title",
        "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        className,
      )}
      {...props}
    />
  );
}

// Seção de texto, separada da anterior por uma linha.
export function ProseSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Separator />
      <section className="flex flex-col gap-3">
        <h2>{title}</h2>
        {children}
      </section>
    </>
  );
}
