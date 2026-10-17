"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { START_SCREENS, type StartScreen } from "@/contracts/profile";
import { changeStartScreen } from "./actions";

const OPTIONS: Record<StartScreen, { label: string; hint: string }> = {
  home: { label: "Home", hint: "Busca e o que está em alta." },
  following: {
    label: "Seguintes",
    hint: "O próximo episódio das suas séries e os filmes que você quer ver.",
  },
};

// Escolha da tela em que o usuário começa ao entrar (e que o menu "Início"
// abre). Salva na hora, ao escolher uma opção.
export function StartScreenForm({ current }: { current: StartScreen }) {
  const [selected, setSelected] = useState(current);
  const [status, setStatus] = useState<"saved" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(value: StartScreen) {
    const previous = selected;
    setSelected(value);
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await changeStartScreen({ startScreen: value });
        if (result.ok) {
          setStatus("saved");
        } else {
          setSelected(previous);
          setStatus("failed");
        }
      } catch {
        setSelected(previous);
        setStatus("failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        aria-label="Tela inicial"
        value={selected}
        disabled={pending}
        onValueChange={(value) => {
          if (START_SCREENS.includes(value as StartScreen)) {
            choose(value as StartScreen);
          }
        }}
      >
        {START_SCREENS.map((value) => (
          <Label key={value} className="items-start gap-3 leading-normal">
            <RadioGroupItem value={value} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span>{OPTIONS[value].label}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {OPTIONS[value].hint}
              </span>
            </span>
          </Label>
        ))}
      </RadioGroup>
      <p
        role="status"
        className={
          status === "failed"
            ? "text-sm text-destructive"
            : "text-sm text-muted-foreground"
        }
      >
        {status === "saved"
          ? "Salvo."
          : status === "failed"
            ? "Não foi possível salvar. Tente de novo."
            : ""}
      </p>
    </div>
  );
}
