"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bell, Settings, User } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/app/context/AuthContext";

const items = [
  { href: "/home",     label: "Home",     Icon: Home },
  { href: "/requests", label: "Requests", Icon: Bell, badge: 1 },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/profile",  label: "Profile",  Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, Icon, badge }) => (
        <Link key={href} href={href} className={clsx("bn-item", pathname === href && "on")}>
          <span className="bn-ic">
            {href === "/profile" && user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name ?? "Profile"} className="bn-avatar" referrerPolicy="no-referrer" />
            ) : (
              <Icon size={22} />
            )}
            {badge != null && <span className="bn-badge">{badge}</span>}
          </span>
          <span className="bn-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
