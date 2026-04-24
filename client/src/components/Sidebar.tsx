"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, List, Bell, Settings, Copy, LogOut, User } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/app/context/AuthContext";
import { truncateAddress } from "@/utils/address";

const navItems = [
  { href: "/home",     label: "Home",     Icon: Home },
  { href: "/activity", label: "Activity", Icon: List },
  { href: "/requests", label: "Requests", Icon: Bell, badge: 1 },
  { href: "/profile",  label: "Settings", Icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, wallet, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const copyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  const handleProfile = () => {
    setMenuOpen(false);
    router.push("/profile");
  };

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
        {user && (
          <div className="sb-wallet-wrap" ref={menuRef}>
            {/* Popover menu */}
            {menuOpen && (
              <div className="sb-popover">
                <button className="sb-pop-item" onClick={handleProfile}>
                  <User size={13} />
                  Profile
                </button>
                <button className="sb-pop-item danger" onClick={handleLogout}>
                  <LogOut size={13} />
                  Log out
                </button>
              </div>
            )}

            <div
              className={clsx("sb-wallet", menuOpen && "open")}
              onClick={() => setMenuOpen((v) => !v)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setMenuOpen((v) => !v)}
            >
              <div className="sb-avatar">
                {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="sb-w-meta">
                <div className="sb-w-name">{user?.name ?? user?.email}</div>
                <div className="sb-w-addr">
                  {wallet?.address ? truncateAddress(wallet.address) : "—"}
                </div>
              </div>
              <span className="sb-w-copy" onClick={copyAddress} title="Copy address">
                <Copy size={13} />
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
