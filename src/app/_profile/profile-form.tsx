"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BIO_MAX_LENGTH } from "@/contracts/profile";
import { saveProfile } from "./actions";
import type { ProfileFormLabels } from "./form-labels";

type Props = {
  defaults: { displayName: string; bio: string; isPrivate: boolean };
  labels: ProfileFormLabels;
};

// Nome de exibição, bio e perfil privado. Os campos são controlados: o React
// limpa o formulário ao fim da ação, e o Checkbox não volta sozinho. Sem
// `maxLength`: o navegador conta unidades UTF-16 (um emoji vale dois) e o
// limite conta caracteres; quem barra é o servidor, e o contador avisa.
// Sucesso vira aviso no canto da tela (toast); erro fica no formulário.
export function ProfileForm({ defaults, labels }: Props) {
  const [state, formAction, pending] = useActionState(saveProfile, {});
  useEffect(() => {
    // Mesmo id: salvar de novo substitui o aviso em vez de empilhar.
    if (state.saved) toast.success(labels.saved, { id: "perfil-salvo" });
  }, [state, labels.saved]);
  const [displayName, setDisplayName] = useState(defaults.displayName);
  const [bio, setBio] = useState(defaults.bio);
  const [isPrivate, setIsPrivate] = useState(defaults.isPrivate);
  // O que está gravado: o botão só habilita quando algo difere disso.
  const [saved, setSaved] = useState(defaults);
  // Depois de salvar, mostra o que ficou gravado (sem os espaços das pontas).
  const [shownState, setShownState] = useState(state);
  if (state !== shownState) {
    setShownState(state);
    if (state.saved && state.submitted) {
      setDisplayName(state.submitted.displayName);
      setBio(state.submitted.bio);
      setIsPrivate(state.submitted.isPrivate);
      setSaved(state.submitted);
    }
  }
  // O servidor corta os espaços das pontas: mexer só neles não é mudança.
  const changed =
    displayName.trim() !== saved.displayName ||
    bio.trim() !== saved.bio ||
    isPrivate !== saved.isPrivate;
  const bioLength = [...bio].length;
  const errorId = "perfil-erro";

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <Label htmlFor="displayName">{labels.displayName}</Label>
      <Input
        id="displayName"
        name="displayName"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        autoComplete="name"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? errorId : undefined}
      />
      <Label htmlFor="bio">{labels.bio}</Label>
      <Textarea
        id="bio"
        name="bio"
        value={bio}
        onChange={(event) => setBio(event.target.value)}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? `${errorId} bio-contador` : "bio-contador"}
      />
      <p id="bio-contador" className="text-xs text-muted-foreground">
        {labels.bioCounter
          .replace("{count}", String(bioLength))
          .replace("{max}", String(BIO_MAX_LENGTH))}
      </p>
      <Label className="gap-2 font-normal">
        <Checkbox
          name="isPrivate"
          checked={isPrivate}
          onCheckedChange={setIsPrivate}
        />
        {labels.private}
      </Label>
      <p className="text-xs text-muted-foreground">{labels.privateHint}</p>
      {state.error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !changed}>
        {pending ? labels.saving : labels.submit}
      </Button>
    </form>
  );
}
