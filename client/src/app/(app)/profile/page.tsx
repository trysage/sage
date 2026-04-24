"use client";

import { Copy, ExternalLink, Shield, Mail, LogOut } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { useAuth } from "@/app/context/AuthContext";

function truncate(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function ProfilePage() {
  const { user, wallet, logout } = useAuth();

  const initial = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?";
  const address = wallet?.address ?? "";

  function copyAddress() {
    if (address) navigator.clipboard.writeText(address);
  }

  return (
    <div className="app-shell no-rail">
      <div className="ambient" />

      <Sidebar />

      <main className="main" style={{ paddingRight: 56 }}>
        <div className="main-top">
          <img src="/sage-mark-mint.png" alt="Sage" className="mobile-logo" />
          <AgentId />
          <div className="right">
            <span className="sync-label">Last sync · 12s</span>
          </div>
        </div>

        <div className="pf-eyebrow">
          <span className="ix">Identity</span>
          <span className="dash" />
        </div>

        {/* Portrait + identity fields */}
        <section className="pf-hero">
          <div className="pf-portrait">
            <div className="pf-avatar">{initial}</div>
            <div className="pf-glyph">
              <Shield size={14} />
            </div>
          </div>

          <div className="pf-id">
            <h1 className="pf-name">
              {user?.name
                ? (() => {
                    const parts = user.name.split(" ");
                    const last = parts.pop();
                    return (
                      <>
                        {parts.join(" ")}&nbsp;<em>{last}.</em>
                      </>
                    );
                  })()
                : <em>{user?.email ?? "—"}</em>}
            </h1>

            <div className="pf-meta">
              <div className="pf-field">
                <span className="cap">
                  <Mail size={14} />
                  Email
                </span>
                <span className="val">{user?.email ?? "—"}</span>
              </div>

              <div className="pf-field network">
                <span className="cap">
                  <span className="dot" />
                  Network
                </span>
                <span className="val">Solana · Mainnet</span>
              </div>

              <div className="pf-field full">
                <span className="cap">
                  <Shield size={14} />
                  Wallet address
                </span>
                <span className="val mono" title={address}>
                  {address ? truncate(address) : "—"}
                </span>
              </div>
            </div>

            <div className="pf-acts">
              <button className="ghost-btn" onClick={copyAddress} disabled={!address}>
                <Copy size={13} /> Copy address
              </button>
              <button className="ghost-btn" disabled={!address}>
                <ExternalLink size={13} /> Open in Squads
              </button>
            </div>
          </div>
        </section>

        {/* Logout */}
        <section className="pf-logout">
          <div className="lo-meta">
            <div className="lo-t">Sign out of Sage</div>
            <div className="lo-s">
              Your guardian goes quiet until you return. Pending reviews stay queued.
            </div>
          </div>
          <button className="lo-btn" onClick={logout}>
            <LogOut size={14} /> Log out
          </button>
        </section>
      </main>
    </div>
  );
}
