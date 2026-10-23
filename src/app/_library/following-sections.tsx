"use client";

import { SegmentedControl } from "@/components/segmented-control";

// Seções de Seguintes: só "Para assistir" existe; "Em breve" espera o
// calendário de lançamentos (Fase 2.3).
export function FollowingSections({
  labels,
}: {
  labels: { sections: string; queue: string; soon: string; soonHint: string };
}) {
  return (
    <SegmentedControl
      value="queue"
      onChange={() => {}}
      ariaLabel={labels.sections}
      options={[
        { value: "queue", label: labels.queue },
        {
          value: "soon",
          label: labels.soon,
          disabled: true,
          hint: labels.soonHint,
        },
      ]}
    />
  );
}
