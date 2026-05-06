"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { ShieldCheck, ShieldOff, Loader2, CheckCircle2, AlertCircle, MessageCircle, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { useAuth } from "@/app/context/AuthContext";
import { useScreeningStatus } from "@/app/context/ScreeningStatusContext";
import { patchStatus } from "@/lib/api";

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "https://t.me/sage_guard_bot";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function SettingsPage() {
  const { vaultPda, identityToken, privyUser } = useAuth();
  const {
    screeningMode, botConnected, telegramChatId, telegramLinked,
    fullyActivated, isScreeningActive, loading,
    setScreeningMode, setBotConnected, setTelegramChatId, refetch,
  } = useScreeningStatus();

  const [toggling, setToggling] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [botActivationStarted, setBotActivationStarted] = useState(false);
  const [checkingBot, setCheckingBot] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const checkBotConnection = useCallback(async () => {
    if (!vaultPda || !identityToken) return;
    setCheckingBot(true);
    try {
      const res = await fetch(`${API_URL}/status?vault=${encodeURIComponent(vaultPda)}`, {
        headers: { Authorization: `Bearer ${identityToken}` },
      });
      const d = await res.json();
      if (d.botConnected) {
        setBotConnected(true);
        stopPolling();
      }
    } catch { /* ignore */ } finally { setCheckingBot(false); }
  }, [vaultPda, identityToken, setBotConnected, stopPolling]);

  useEffect(() => {
    if (botConnected) stopPolling();
  }, [botConnected, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const tgAccount = (privyUser?.linkedAccounts as unknown as Array<Record<string, unknown>> | undefined)
    ?.find((a) => a.type === "telegram");
  const tgDisplayName = tgAccount
    ? (tgAccount.username ? `@${tgAccount.username}` : (tgAccount.firstName as string | undefined) ?? `ID ${telegramChatId}`)
    : (telegramChatId ? `ID ${telegramChatId}` : null);

  const { linkTelegram } = useLinkAccount({
    onSuccess: ({ linkedAccount, linkMethod }) => {
      if (linkMethod === "telegram") {
        const acc = linkedAccount as unknown as Record<string, unknown>;
        const chatId = String(
          (acc.telegramUserId ?? acc.subject ?? acc.username ?? "") as string
        );
        if (chatId && vaultPda && identityToken) {
          setTelegramChatId(chatId);
          patchStatus(vaultPda, { telegramChatId: chatId }, identityToken).catch(() => {});
        }
      }
      setLinkingTelegram(false);
    },
    onError: () => setLinkingTelegram(false),
  });

  const { unlinkTelegram } = usePrivy();

  const handleToggle = async () => {
    if (!vaultPda || !identityToken) return;
    setToggling(true);
    try {
      const next = !screeningMode;
      await patchStatus(vaultPda, { screeningMode: next }, identityToken);
      setScreeningMode(next);
    } catch { /* ignore */ } finally { setToggling(false); }
  };

  const handleStartBot = () => {
    window.open(BOT_URL, "_blank");
    setBotActivationStarted(true);
    pollRef.current = setInterval(checkBotConnection, 4000);
  };

  const handleUnlinkTelegram = async () => {
    try {
      if (tgAccount) {
        const id = String((tgAccount.subject ?? tgAccount.telegramUserId ?? tgAccount.username ?? "") as string);
        if (id) await (unlinkTelegram as unknown as (id: string) => Promise<unknown>)(id);
      }
      setTelegramChatId(null);
      setBotConnected(false);
      setBotActivationStarted(false);
      stopPolling();
      if (vaultPda && identityToken) {
        await patchStatus(vaultPda, { telegramChatId: "", botConnected: false, screeningMode: false }, identityToken);
        setScreeningMode(false);
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="app-shell no-rail">
      <div className="ambient" />
      <Sidebar />

      <main className="main" style={{ paddingRight: 56 }}>
        <div className="main-top">
          <img src="/sage-mark-mint.png" alt="Sage" className="mobile-logo" />
          <AgentId />
        </div>

        <div className="pf-eyebrow">
          <span className="ix">Settings</span>
          <span className="dash" />
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "var(--gold)" }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 520 }}>

            {/* ── Sage Guard toggle ── */}
            <div className="sg-card">
              <div className="sg-row">
                <div className={`sg-shield-ico ${isScreeningActive ? "on" : ""}`}>
                  {isScreeningActive
                    ? <ShieldCheck size={20} />
                    : <ShieldOff size={20} />}
                </div>
                <div className="sg-meta">
                  <div className="sg-title-row">
                    <span className="sg-title">Sage Guard</span>
                    <span className={`sg-badge ${isScreeningActive ? "on" : ""}`}>
                      {isScreeningActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="sg-sub">
                    {isScreeningActive
                      ? "AI screening all transactions"
                      : !fullyActivated
                      ? "Connect Telegram to activate"
                      : "Screening paused"}
                  </span>
                </div>
                <button
                  className={`sg-toggle ${screeningMode ? "on" : ""}`}
                  onClick={handleToggle}
                  disabled={toggling}
                  aria-label="Toggle screening"
                >
                  {toggling
                    ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    : <span className="sg-toggle-knob" />}
                </button>
              </div>

              {screeningMode && !fullyActivated && (
                <div className="sg-warn">
                  <AlertCircle size={13} />
                  <span>Setup required — connect Telegram below to activate screening</span>
                </div>
              )}

              {fullyActivated && !screeningMode && (
                <div className="sg-warn amber">
                  <AlertCircle size={13} />
                  <span>Screening paused — transactions execute immediately without AI review</span>
                </div>
              )}
            </div>

            {/* ── Telegram activation ── */}
            <div>
              <p className="sg-section-label">Telegram</p>
              <div className="sg-card">

                {/* Step 1 — Link Telegram */}
                <div className="sg-step">
                  <div className={`sg-step-num ${telegramLinked ? "done" : ""}`}>
                    {telegramLinked ? <CheckCircle2 size={14} /> : "1"}
                  </div>
                  <div className="sg-step-body">
                    <span className="sg-step-title">
                      {telegramLinked ? `Linked${tgDisplayName ? ` · ${tgDisplayName}` : ""}` : "Link your Telegram"}
                    </span>
                    <span className="sg-step-sub">
                      {telegramLinked ? "Telegram account connected" : "Connect Telegram to receive notifications"}
                    </span>
                  </div>
                  {telegramLinked ? (
                    <button className="sg-step-action danger" onClick={handleUnlinkTelegram}>
                      <X size={12} /> Unlink
                    </button>
                  ) : (
                    <button
                      className="sg-step-action"
                      onClick={() => { setLinkingTelegram(true); linkTelegram(); }}
                      disabled={linkingTelegram}
                    >
                      {linkingTelegram ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "Link"}
                    </button>
                  )}
                </div>

                <div className="sg-divider" />

                {/* Step 2 — Start bot */}
                <div className={`sg-step ${!telegramLinked ? "muted" : ""}`}>
                  <div className={`sg-step-num ${botConnected ? "done" : ""}`}>
                    {botConnected ? <CheckCircle2 size={14} /> : "2"}
                  </div>
                  <div className="sg-step-body">
                    <span className="sg-step-title">
                      {botConnected ? "Bot connected" : "Start the Sage bot"}
                    </span>
                    <span className="sg-step-sub">
                      {botConnected
                        ? "You'll receive transaction alerts on Telegram"
                        : "Open the bot and send /start to activate"}
                    </span>
                  </div>
                  {!botConnected && (
                    <button
                      className="sg-step-action"
                      onClick={handleStartBot}
                      disabled={!telegramLinked}
                    >
                      <MessageCircle size={12} />
                      {botActivationStarted
                        ? checkingBot ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : "Check"
                        : "Open"}
                    </button>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </main>

      <style>{`
        .sg-card {
          background: var(--surface, rgba(255,255,255,.04));
          border: 1px solid var(--border, rgba(255,255,255,.08));
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .sg-row { display: flex; align-items: center; gap: 14px; }
        .sg-shield-ico {
          width: 42px; height: 42px; border-radius: 12px;
          background: rgba(255,255,255,.06);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted, #64748b);
          flex-shrink: 0; transition: background .25s, color .25s;
        }
        .sg-shield-ico.on { background: rgba(var(--gold-rgb,212,175,55),.12); color: var(--gold,#d4af37); }
        .sg-meta { flex: 1; min-width: 0; }
        .sg-title-row { display: flex; align-items: center; gap: 8px; }
        .sg-title { font-size: 14px; font-weight: 600; color: var(--text, #f1f5f9); }
        .sg-badge {
          font-size: 10px; font-weight: 500;
          padding: 2px 8px; border-radius: 99px;
          background: rgba(255,255,255,.06); color: var(--text-muted, #64748b);
          transition: background .25s, color .25s;
        }
        .sg-badge.on { background: rgba(var(--gold-rgb,212,175,55),.15); color: var(--gold,#d4af37); }
        .sg-sub { font-size: 12px; color: var(--text-muted, #64748b); margin-top: 2px; display: block; }
        .sg-toggle {
          width: 46px; height: 24px; border-radius: 99px;
          background: rgba(255,255,255,.12); border: none; cursor: pointer;
          position: relative; flex-shrink: 0; transition: background .25s;
          display: flex; align-items: center; justify-content: center;
        }
        .sg-toggle.on { background: var(--gold, #d4af37); }
        .sg-toggle-knob {
          position: absolute; top: 2px; left: 2px;
          width: 20px; height: 20px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,.3); transition: transform .25s;
        }
        .sg-toggle.on .sg-toggle-knob { transform: translateX(22px); }
        .sg-warn {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 12px; border-radius: 10px;
          background: rgba(59,130,246,.08); color: #93c5fd;
          font-size: 12px; line-height: 1.5;
        }
        .sg-warn.amber { background: rgba(251,191,36,.08); color: #fbbf24; }
        .sg-section-label {
          font-size: 11px; font-weight: 500; letter-spacing: .07em;
          text-transform: uppercase; color: var(--text-muted, #64748b);
          margin-bottom: 10px; padding-left: 2px; display: block;
        }
        .sg-step {
          display: flex; align-items: center; gap: 12px;
          opacity: 1; transition: opacity .2s;
        }
        .sg-step.muted { opacity: .4; pointer-events: none; }
        .sg-step-num {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600;
          background: rgba(255,255,255,.08); color: var(--text-muted, #64748b);
          transition: background .25s, color .25s;
        }
        .sg-step-num.done { background: rgba(52,211,153,.12); color: #34d399; }
        .sg-step-body { flex: 1; min-width: 0; }
        .sg-step-title { font-size: 13px; font-weight: 500; color: var(--text, #f1f5f9); display: block; }
        .sg-step-sub { font-size: 11px; color: var(--text-muted, #64748b); display: block; margin-top: 2px; }
        .sg-step-action {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 500;
          background: rgba(var(--gold-rgb,212,175,55),.12); color: var(--gold, #d4af37);
          transition: background .15s; flex-shrink: 0;
        }
        .sg-step-action:hover:not(:disabled) { background: rgba(var(--gold-rgb,212,175,55),.2); }
        .sg-step-action:disabled { opacity: .5; cursor: default; }
        .sg-step-action.danger { background: rgba(239,68,68,.1); color: #f87171; }
        .sg-step-action.danger:hover { background: rgba(239,68,68,.18); }
        .sg-divider { height: 1px; background: rgba(255,255,255,.06); margin: 2px 0; }
      `}</style>
    </div>
  );
}
