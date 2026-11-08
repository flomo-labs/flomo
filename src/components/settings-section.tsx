import { cn } from "cn";

// Grupo de Configurações (#256): cartão com título, frase de apoio e o
// conteúdo. `destructive` marca a zona de ação sem volta (borda vermelha
// suave). Um por assunto: perfil, formas de entrar, conta.
export function SettingsSection({
  title,
  description,
  destructive = false,
  className,
  children,
}: {
  title: string;
  description?: string;
  destructive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-card border border-border p-5",
        destructive && "border-destructive/40",
        className,
      )}
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
