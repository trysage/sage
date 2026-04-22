"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Bell, Settings } from "lucide-react";
import { clsx } from "clsx";

const items = [
  { href: "/home",     label: "Home",     Icon: Home },
  { href: "/activity", label: "Activity", Icon: List },
  { href: "/requests", label: "Requests", Icon: Bell, badge: 1 },
  { href: "/profile",  label: "Settings", Icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, Icon, badge }) => (
        <Link key={href} href={href} className={clsx("bn-item", pathname === href && "on")}>
          <span className="bn-ic">
            <Icon size={22} />
            {badge != null && <span className="bn-badge">{badge}</span>}
          </span>
          <span className="bn-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
