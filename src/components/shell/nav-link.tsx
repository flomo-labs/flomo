"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, type NavItem } from "./nav-items";
import { NavLabel } from "./nav-label";
import { navLinkClass } from "./nav-link-style";

export function NavLink({ item }: { item: NavItem }) {
  const active = isNavItemActive(item, usePathname());
  const common = {
    className: navLinkClass(active),
    "aria-current": active ? "page" : undefined,
  } as const;
  return (
    <Link href={item.href} {...common}>
      <NavLabel active={active}>{item.label}</NavLabel>
    </Link>
  );
}
