import Link from "next/link";
import type { ReactNode } from "react";
import { profileInitials } from "@/app/_profile/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type PersonRowPerson = {
  handle: string;
  displayName: string | null;
};

// Lista de pessoas (nome, @handle e foto): usada nas listas de seguidores e de
// seguindo e nas solicitações pendentes. O `ul` é do `PersonList`; cada
// linha é um `PersonRow`, com `children` para o que vem à direita (botões).
export function PersonList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
}

export function PersonRow({
  person,
  badge,
  children,
}: {
  person: PersonRowPerson;
  // Selo ao lado do @handle (ex.: "Segue você").
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const name = person.displayName ?? `@${person.handle}`;
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card border border-border p-3">
      <Link
        href={`/@${person.handle}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar>
          <AvatarFallback>
            {profileInitials(person.displayName, person.handle)}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col">
          <span className="font-medium break-words">{name}</span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="break-words">@{person.handle}</span>
            {badge}
          </span>
        </span>
      </Link>
      {children ? <div className="flex gap-2">{children}</div> : null}
    </li>
  );
}
