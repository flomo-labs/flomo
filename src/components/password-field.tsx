import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Campo de senha com rótulo (e dica opcional). Usado nas telas e diálogos de
// senha nova; o "autoComplete" diz ao navegador se é a senha atual ou nova.
export function PasswordField({
  id,
  label,
  hint,
  autoComplete = "new-password",
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "id"> & {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-dica` : undefined}
        {...props}
      />
      {hint ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
