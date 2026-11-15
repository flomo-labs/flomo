import Link from "next/link";
import type { ReactNode } from "react";

// Contagens "N seguidores" e "N seguindo" no cabeçalho do perfil. Cada uma
// leva à sua lista quando `listsHref` existe; sem ele (perfil privado que a
// pessoa não pode ver) é só o número.
export function FollowCounts({
  followers,
  following,
  listsHref,
  label,
}: {
  followers: ReactNode;
  following: ReactNode;
  listsHref: { followers: string; following: string } | null;
  label: string;
}) {
  const items = [
    { key: "followers", text: followers, href: listsHref?.followers },
    { key: "following", text: following, href: listsHref?.following },
  ];
  return (
    <ul aria-label={label} className="flex flex-wrap gap-x-4 text-sm">
      {items.map(({ key, text, href }) => (
        <li key={key}>
          {href ? (
            <Link href={href} className="hover:underline">
              {text}
            </Link>
          ) : (
            <span>{text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
