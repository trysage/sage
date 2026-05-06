"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { ShieldCheck, ShieldOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { ActivationDialog } from "@/components/ActivationDialog";
import { useAuth } from "@/app/context/AuthContext";
import { useScreeningStatus } from "@/app/context/ScreeningStatusContext";
import { patchStatus, upsertUser, getStatus } from "@/lib/api";

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "https://t.me/sage_guard_bot";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, type: "spring" as const, bounce: 0.12 },
  },
};

export default function SettingsPage() {
  const { vaultPda, identityToken, telegramUserId, privyUser } = useAuth();
  const {
    screeningMode,
    botConnected,
    telegramLinked,
    fullyActivated,
    isScreeningActive,
    loading,
    setScreeningMode,
    setBotConnected,
    setTelegramLinked,
  } = useScreeningStatus();

  const [toggling, setToggling] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [botActivationInitiated, setBotActivationInitiated] = useState(false);
  const [isCheckingBotConnection, setIsCheckingBotConnection] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevFullyActivatedRef = useRef<boolean | null>(null);
  const { unlinkTelegram } = usePrivy();

  // Extract TG account details for display
  const tgAccount = (privyUser?.linkedAccounts as unknown as Array<Record<string, unknown>> | undefined)
    ?.find((a) => a.type === "telegram");
  const tgUsername = tgAccount?.username as string | undefined;
  const tgFirstName = tgAccount?.firstName as string | undefined;
  const tgDisplayName = tgUsername
    ? `@${tgUsername}`
    : tgFirstName ?? (telegramUserId ? `ID ${telegramUserId}` : null);

  const { linkTelegram } = useLinkAccount({
    onSuccess: ({ linkedAccount, linkMethod }) => {
      if (linkMethod === "telegram") {
        const acc = linkedAccount as unknown as Record<string, unknown>;
        const tgId = String(
          (acc.telegramUserId ?? acc.subject ?? acc.username ?? "") as string
        );
        if (tgId && vaultPda && identityToken) {
          setTelegramLinked(true);
          patchStatus(vaultPda, { telegramChatId: tgId }, identityToken).catch(() => {});
          upsertUser({ vaultAddress: vaultPda, telegramId: tgId }, identityToken).catch(() => {});
        }
      }
      setLinkingTelegram(false);
    },
    onError: () => setLinkingTelegram(false),
  });

  const handleToggle = async () => {
    // if (!fullyActivated) {
    //   setActivationOpen(true);
    //   return;
    // }
    if (!vaultPda || !identityToken) return;
    setToggling(true);
    try {
      const data = await patchStatus(vaultPda, { screeningMode: !screeningMode }, identityToken);
      if (typeof data.screeningMode === "boolean") {
        setScreeningMode(data.screeningMode);
      }
    } catch {
      // silent
    } finally {
      setToggling(false);
    }
  };

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const checkBotConnection = useCallback(async () => {
    if (!vaultPda || !identityToken) return;
    setIsCheckingBotConnection(true);
    try {
      const data = await getStatus(vaultPda, identityToken);
      if (data.botConnected) {
        setBotConnected(true);
        stopPolling();
      }
    } catch {
      // silent
    } finally {
      setIsCheckingBotConnection(false);
    }
  }, [vaultPda, identityToken, setBotConnected, stopPolling]);

  const handleStartBotActivation = useCallback(() => {
    window.open(BOT_URL, "_blank");
    setBotActivationInitiated(true);
    pollIntervalRef.current = setInterval(checkBotConnection, 4000);
  }, [checkBotConnection]);

  useEffect(() => {
    if (botConnected) stopPolling();
  }, [botConnected, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Auto-enable screening the moment the user completes both activation steps.
  // Skip initial load so a deliberate off-state isn't overridden.
  useEffect(() => {
    if (loading || !vaultPda || !identityToken) return;
    if (prevFullyActivatedRef.current === null) {
      prevFullyActivatedRef.current = fullyActivated;
      return;
    }
    if (!prevFullyActivatedRef.current && fullyActivated && !screeningMode) {
      patchStatus(vaultPda, { screeningMode: true }, identityToken)
        .then(() => setScreeningMode(true))
        .catch(() => {});
    }
    prevFullyActivatedRef.current = fullyActivated;
  }, [loading, fullyActivated, screeningMode, vaultPda, identityToken]);

  const handleUnlinkTelegram = async () => {
    try {
      if (tgAccount) {
        const id = String((tgAccount.subject ?? tgAccount.telegramUserId ?? tgAccount.username ?? "") as string);
        if (id) await (unlinkTelegram as unknown as (id: string) => Promise<unknown>)(id);
      }
      setTelegramLinked(false);
      setBotConnected(false);
      setBotActivationInitiated(false);
      setScreeningMode(false);
      stopPolling();
      if (vaultPda && identityToken) {
        await patchStatus(vaultPda, { telegramChatId: "", botConnected: false, screeningMode: false }, identityToken);
        await upsertUser({ vaultAddress: vaultPda, telegramId: "" }, identityToken);
      }
    } catch {
      // ignore
    }
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
            <Loader2 size={24} className="animate-spin text-mint-400" />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="st-stack"
          >
            {/* Sage Guard toggle card */}
            <motion.div variants={staggerItem} className="st-card">
              <div className="st-toggle-row">
                <div className={`st-shield-ico${isScreeningActive ? " on" : ""}`}>
                  {isScreeningActive
                    ? <ShieldCheck size={20} />
                    : <ShieldOff size={20} />}
                </div>
                <div className="st-meta">
                  <div className="st-title-row">
                    <span className="st-title">Sage Guard</span>
                    <span className={`st-badge${isScreeningActive ? " on" : ""}`}>
                      {isScreeningActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="st-sub">
                    {isScreeningActive
                      ? "AI screening all transactions"
                      : !fullyActivated
                      ? "Setup required"
                      : "Screening disabled"}
                  </span>
                </div>
                <button
                  className={`st-toggle${screeningMode ? " on" : ""}`}
                  onClick={handleToggle}
                  disabled={toggling}
                  aria-label="Toggle screening"
                >
                  {toggling
                    ? <Loader2 size={12} className="animate-spin" />
                    : <span className="st-toggle-knob" />}
                </button>
              </div>

              {isScreeningActive && (
                <>
                  <div className="st-divider" />
                  <button className="st-act-row" onClick={() => setActivationOpen(true)}>
                    <div className={`st-act-ico${fullyActivated ? " green" : " amber"}`}>
                      {fullyActivated
                        ? <CheckCircle2 size={15} />
                        : <AlertCircle size={15} />}
                    </div>
                    <div className="st-act-body">
                      <span className="st-act-title">
                        {fullyActivated ? "Activated" : "Setup required"}
                      </span>
                      <span className="st-act-sub">
                        {fullyActivated
                          ? `Notifications → ${tgDisplayName ?? "Telegram"}`
                          : "Complete 2 steps to enable the agent"}
                      </span>
                    </div>
                    <span className="st-act-btn">
                      {fullyActivated ? "Manage" : "Activate"}
                    </span>
                  </button>
                </>
              )}
            </motion.div>

            {/* Warning banner when screening disabled but setup complete */}
            <AnimatePresence>
              {fullyActivated && !screeningMode && (
                <motion.div
                  key="warn"
                  variants={staggerItem}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                  className="st-warn"
                >
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Transactions will execute immediately without AI review. Make sure you trust all destinations.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <ActivationDialog
        open={activationOpen}
        onClose={() => setActivationOpen(false)}
        telegramLinked={telegramLinked}
        botConnected={botConnected}
        linkingTelegram={linkingTelegram}
        botActivationInitiated={botActivationInitiated}
        isCheckingBotConnection={isCheckingBotConnection}
        tgDisplayName={tgDisplayName}
        onLinkTelegram={() => {
          setLinkingTelegram(true);
          linkTelegram();
        }}
        onStartBotActivation={handleStartBotActivation}
        onCheckBotConnection={checkBotConnection}
        onUnlinkTelegram={handleUnlinkTelegram}
      />

      <style>{`
        .st-stack {
          display: flex; flex-direction: column; gap: 16px;
          max-width: 520px; padding-top: 24px;
        }

        /* Card */
        .st-card {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: var(--r-lg, 22px);
          padding: 20px;
          display: flex; flex-direction: column; gap: 16px;
        }
        .st-divider {
          height: 1px; background: rgba(255,255,255,.06);
          margin: 0 -4px;
        }

        /* Toggle row */
        .st-toggle-row { display: flex; align-items: center; gap: 14px; }
        .st-shield-ico {
          width: 42px; height: 42px; border-radius: var(--r-md, 14px);
          background: rgba(255,255,255,.05);
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-300); flex-shrink: 0;
          transition: background .25s, color .25s;
        }
        .st-shield-ico.on {
          background: rgba(91,209,142,.12);
          color: var(--mint-400);
        }
        .st-meta { flex: 1; min-width: 0; }
        .st-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
        .st-title { font-size: 14px; font-weight: 600; color: var(--ink-0); }
        .st-badge {
          font-size: 10px; font-weight: 600; letter-spacing: .04em;
          padding: 2px 8px; border-radius: var(--r-pill);
          background: rgba(255,255,255,.06); color: var(--ink-300);
          text-transform: uppercase;
          transition: background .25s, color .25s;
        }
        .st-badge.on { background: rgba(91,209,142,.14); color: var(--mint-400); }
        .st-sub {
          font-size: 12px; color: var(--ink-300); line-height: 1.4;
        }

        /* Toggle switch */
        .st-toggle {
          width: 44px; height: 24px; border-radius: var(--r-pill);
          background: rgba(255,255,255,.1); border: none; cursor: pointer;
          position: relative; flex-shrink: 0;
          transition: background .25s;
          display: flex; align-items: center; justify-content: center;
        }
        .st-toggle.on { background: var(--mint-400); }
        .st-toggle-knob {
          position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--ink-900);
          box-shadow: 0 1px 3px rgba(0,0,0,.4);
          transition: transform .25s;
        }
        .st-toggle.on .st-toggle-knob { transform: translateX(20px); }

        /* Activation row */
        .st-act-row {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: var(--r-md, 14px);
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.06);
          cursor: pointer; text-align: left;
          transition: background .15s, border-color .15s;
        }
        .st-act-row:hover {
          background: rgba(91,209,142,.04);
          border-color: rgba(91,209,142,.15);
        }
        .st-act-ico {
          width: 30px; height: 30px; border-radius: var(--r-sm, 8px);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .st-act-ico.green { background: rgba(91,209,142,.12); color: var(--mint-400); }
        .st-act-ico.amber { background: rgba(240,179,60,.1); color: var(--watch); }
        .st-act-body { flex: 1; min-width: 0; }
        .st-act-title {
          font-size: 12.5px; font-weight: 600; color: var(--ink-0);
          display: block; margin-bottom: 2px;
        }
        .st-act-sub {
          font-size: 11px; color: var(--ink-300); display: block;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .st-act-btn {
          font-size: 11px; font-weight: 500;
          padding: 4px 10px; border-radius: var(--r-sm, 8px);
          background: rgba(91,209,142,.1); color: var(--mint-400);
          flex-shrink: 0;
        }

        /* Warning banner */
        .st-warn {
          display: flex; align-items: flex-start; gap: 9px;
          padding: 12px 14px; border-radius: var(--r-md, 14px);
          background: rgba(240,179,60,.07);
          border: 1px solid rgba(240,179,60,.12);
          color: var(--watch); font-size: 12px; line-height: 1.55;
        }
      `}</style>
    </div>
  );
}
