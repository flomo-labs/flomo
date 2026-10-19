"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BIO_MAX_LENGTH } from "@/contracts/profile";
import { saveProfile } from "./actions";

type Props = {
  defaults: { displayName: string; bio: string; isPrivate: boolean };
};

// Nome de exibição, bio e perfil privado. Os campos são controlados: o React
// limpa o formulário ao fim da ação, e o Checkbox não volta sozinho. Sem
// `maxLength`: o navegador conta unidades UTF-16 (um emoji vale dois) e o
// limite conta caracteres; quem barra é o servidor, e o contador avisa.
export function ProfileForm({ defaults }: Props) {
  const [state, formAction, pending] = useActionState(saveProfile, {});
  const [displayName, setDisplayName] = useState(defaults.displayName);
  const [bio, setBio] = useState(defaults.bio);
  const [isPrivate, setIsPrivate] = useState(defaults.isPrivate);
  // Depois de salvar, mostra o que ficou gravado (sem os espaços das pontas).
  const [shownState, setShownState] = useState(state);
  if (state !== shownState) {
    setShownState(state);
    if (state.saved && state.submitted) {
      setDisplayName(state.submitted.displayName);
      setBio(state.submitted.bio);
      setIsPrivate(state.submitted.isPrivate);
    }
  }
  const bioLength = [...bio].length;
  const errorId = "perfil-erro";

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <Label htmlFor="displayName">Nome de exibição</Label>
      <Input
        id="displayName"
        name="displayName"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        autoComplete="name"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? errorId : undefined}
      />
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        name="bio"
        value={bio}
        onChange={(event) => setBio(event.target.value)}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? `${errorId} bio-contador` : "bio-contador"}
      />
      <p id="bio-contador" className="text-xs text-muted-foreground">
        {bioLength} de {BIO_MAX_LENGTH} caracteres.
      </p>
      <Label className="gap-2 font-normal">
        <Checkbox
          name="isPrivate"
          checked={isPrivate}
          onCheckedChange={setIsPrivate}
        />
        Perfil privado
      </Label>
      <p className="text-xs text-muted-foreground">
        Quem não é você vê só seu nome, handle e foto; a bio e os números ficam escondidos.
      </p>
      {state.error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      {state.saved && !pending ? (
        <p role="status" className="text-sm">
          Perfil salvo.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar perfil"}
      </Button>
    </form>
  );
}
