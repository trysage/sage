"use client";

import { useState } from "react";
import { Plug, Unplug, ExternalLink } from "lucide-react";
import { useWalletConnect } from "@/app/context/WalletConnectContext";

export function WalletConnectPanel() {
  const { ready, pair, sessions, disconnectSession } = useWalletConnect();
  const [uri, setUri] = useState("");
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionEntries = Object.entries(sessions);

  const handleConnect = async () => {
    const trimmed = uri.trim();
    if (!trimmed) return;
    setError(null);
    setPairing(true);
    try {
      await pair(trimmed);
      setUri("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pair");
    } finally {
      setPairing(false);
    }
  };

  if (!ready) {
    return (
      <div className="wc-not-ready">
        <Plug size={20} />
        <span>WalletConnect initializing…</span>
        <span className="wc-not-ready-sub">Ensure NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set</span>
      </div>
    );
  }

  return (
    <div className="wc-panel">
      {/* URI input */}
      <div className="wc-pair-row">
        <input
          type="text"
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          placeholder="Paste WalletConnect URI (wc:…)"
          className="wc-uri-input"
          disabled={pairing}
        />
        <button
          className="wc-pair-btn"
          onClick={handleConnect}
          disabled={!uri.trim() || pairing}
          aria-label="Connect"
        >
          {pairing ? <span className="wc-spinner-sm" /> : <Plug size={15} />}
        </button>
      </div>
      {error && <span className="wc-pair-error">{error}</span>}

      {/* Active sessions */}
      <div className="wc-sessions-head">
        <span className="wc-sessions-title">Connected DApps</span>
        <span className="wc-sessions-count">{sessionEntries.length}</span>
      </div>

      {sessionEntries.length === 0 ? (
        <div className="wc-empty">
          <Plug size={16} />
          <span>No connected DApps. Paste a WalletConnect URI above.</span>
        </div>
      ) : (
        <div className="wc-sessions-list">
          {sessionEntries.map(([topic, session]) => {
            const peer = (session as unknown as {
              peer?: { metadata?: { name?: string; url?: string; icons?: string[] } };
            })?.peer?.metadata;
            const name = peer?.name || "Unknown DApp";
            const url = peer?.url || "";
            const icon = peer?.icons?.[0];

            return (
              <div key={topic} className="wc-session-row">
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon} alt="" className="wc-session-icon" referrerPolicy="no-referrer" />
                ) : (
                  <div className="wc-session-icon wc-session-icon-ph">
                    <ExternalLink size={13} />
                  </div>
                )}
                <div className="wc-session-meta">
                  <span className="wc-session-name">{name}</span>
                  {url && <span className="wc-session-url">{url}</span>}
                </div>
                <button
                  className="wc-disconnect-btn"
                  onClick={() => disconnectSession(topic)}
                  aria-label="Disconnect"
                  title="Disconnect"
                >
                  <Unplug size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
