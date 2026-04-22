"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, List, Bell, Settings, Copy } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/home",     label: "Home",     Icon: Home },
  { href: "/activity", label: "Activity", Icon: List },
  { href: "/requests", label: "Requests", Icon: Bell, badge: 1 },
  { href: "/profile",  label: "Settings", Icon: Settings },
];

interface SidebarProps {
  walletName?: string;
  walletAddr?: string;
}

export function Sidebar({ walletName = "Koshik", walletAddr = "7xKXt…fbZ3" }: SidebarProps) {
  const pathname = usePathname();
  const initial = walletName.charAt(0).toUpperCase();

  return (
    <aside className="sb">
      <div className="sb-brand">
        <Image src="/sage-mark-mint.png" alt="Sage" width={26} height={26} />
        <span className="word">
          Sage<em>.</em>
        </span>
      </div>

      <div className="sb-section">Navigate</div>

      <nav className="sb-nav">
        {navItems.map(({ href, label, Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={clsx("sb-item", pathname === href && "on")}
          >
            <Icon size={16} />
            <span>{label}</span>
            {badge != null && <span className="sb-badge">{badge}</span>}
          </Link>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="sb-wallet">
          <div className="sb-avatar">{initial}</div>
          <div className="sb-w-meta">
            <div className="sb-w-name">{walletName}</div>
            <div className="sb-w-addr">{walletAddr}</div>
          </div>
          <span className="sb-w-copy">
            <Copy size={13} />
          </span>
        </div>
      </div>
    </aside>
  );
}
