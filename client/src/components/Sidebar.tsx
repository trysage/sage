"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, List, Bell, Settings, Copy, LogOut, User, Sun, Moon, Monitor } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme, type ThemePreference } from "@/app/context/ThemeContext";
import { truncateAddress } from "@/utils/address";

const navItems = [
  { href: "/home",     label: "Home",     Icon: Home },
  { href: "/activity", label: "Activity", Icon: List },
  { href: "/requests", label: "Requests", Icon: Bell, badge: 1 },
  { href: "/profile",  label: "Profile", Icon: User },
  { href: "/settings", label: "Settings", Icon: Settings },
];

const THEME_CYCLE: ThemePreference[] = ["dark", "light", "system"];
const THEME_ICON = { dark: Moon, light: Sun, system: Monitor };
const THEME_LABEL = { dark: "Dark", light: "Light", system: "System" };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, wallet, vaultPda, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(preference) + 1) % THEME_CYCLE.length];
    setPreference(next);
  };

  const ThemeIcon = THEME_ICON[preference];

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
    try { await navigator.clipboard.writeText(wallet.address); } catch { /* ignore */ }
  };

  const copyVault = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vaultPda) return;
    try { await navigator.clipboard.writeText(vaultPda); } catch { /* ignore */ }
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
        <button
          className="sb-theme-btn"
          onClick={cycleTheme}
          title={`Theme: ${THEME_LABEL[preference]}`}
        >
          <ThemeIcon size={14} />
          <span>{THEME_LABEL[preference]}</span>
        </button>

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
                  {vaultPda ? truncateAddress(vaultPda) : wallet?.address ? truncateAddress(wallet.address) : "—"}
                </div>
              </div>
              <span className="sb-w-copy" onClick={vaultPda ? copyVault : copyAddress} title="Copy vault address">
                <Copy size={13} />
              </span>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
