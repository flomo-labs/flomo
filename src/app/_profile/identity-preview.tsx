"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { profileInitials } from "./initials";

type Identity = { displayName: string; handle: string };

type Preview = Identity & {
  setDisplayName: (value: string) => void;
  setHandle: (value: string) => void;
};

// Os dois formulários (nome exibido e @usuário) são separados, mas o cartão
// "Você aparece assim" mostra os dois ao mesmo tempo: o que se digita num
// campo chega ao cartão por este contexto. Fora do provedor (ex.: /cadastro),
// os formulários seguem normalmente, sem cartão.
const IdentityPreviewContext = createContext<Preview | null>(null);

export function IdentityPreviewProvider({
  initial,
  children,
}: {
  initial: Identity;
  children: React.ReactNode;
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [handle, setHandle] = useState(initial.handle);
  const value = useMemo(
    () => ({ displayName, handle, setDisplayName, setHandle }),
    [displayName, handle],
  );
  return (
    <IdentityPreviewContext.Provider value={value}>
      {children}
    </IdentityPreviewContext.Provider>
  );
}

export function useIdentityPreview() {
  return useContext(IdentityPreviewContext);
}

// "Você aparece assim": iniciais, nome e @usuário como saem no perfil.
export function IdentityPreviewCard({ label }: { label: string }) {
  const preview = useIdentityPreview();
  if (!preview) return null;
  const handle = preview.handle.trim().toLowerCase();
  const name = preview.displayName.trim() || (handle ? `@${handle}` : "");
  return (
    <section
      aria-label={label}
      className="flex items-center gap-4 rounded-card bg-muted/40 p-4"
    >
      <Avatar size="lg" className="size-14">
        <AvatarFallback className="text-base font-semibold">
          {profileInitials(preview.displayName, handle)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold break-words">{name || "…"}</p>
        <p className="text-sm text-muted-foreground break-words">
          {handle ? `@${handle}` : "@…"}
        </p>
      </div>
    </section>
  );
}
