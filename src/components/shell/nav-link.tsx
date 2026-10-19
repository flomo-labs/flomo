"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, type NavItem } from "./nav-items";
import { navLinkClass } from "./nav-link-style";

export function NavLink({ item }: { item: NavItem }) {
  const active = isNavItemActive(item, usePathname());
  const common = {
    className: navLinkClass(active),
    "aria-current": active ? "page" : undefined,
  } as const;
  return item.fullNavigation ? (
    <a href={item.href} {...common}>
      {item.label}
    </a>
  ) : (
    <Link href={item.href} {...common}>
      {item.label}
    </Link>
  );
}
