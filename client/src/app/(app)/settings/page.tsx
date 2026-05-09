"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { ShieldCheck, ShieldOff, Loader2, CheckCircle2, AlertCircle, Sun, Moon, Monitor, Globe } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { ActivationDialog } from "@/components/ActivationDialog";
import { useAuth } from "@/app/context/AuthContext";
import { useScreeningStatus } from "@/app/context/ScreeningStatusContext";
import { useTheme, type ThemePreference } from "@/app/context/ThemeContext";
import { useExplorer, EXPLORERS, type Explorer } from "@/app/context/ExplorerContext";
import { patchStatus, upsertUser, getStatus } from "@/lib/api";

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "https://t.me/sage_guard_bot";

const THEME_OPTIONS: { id: ThemePreference; label: string; Icon: React.ElementType }[] = [
  { id: "dark",   label: "Dark",   Icon: Moon },
  { id: "light",  label: "Light",  Icon: Sun },
  { id: "system", label: "System", Icon: Monitor },
];

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
  const { preference: themePref, setPreference: setThemePref } = useTheme();
  const { explorer, setExplorer } = useExplorer();
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
    if (!fullyActivated) {
      setActivationOpen(true);
      return;
    }
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
          <div className="right">
            <span className="sync-label">Settings</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.1 }}
        >
          <div className="pf-eyebrow">
            <span className="ix">Settings</span>
            <span className="dash" />
          </div>
        </motion.div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={24} className="animate-spin text-mint-400" />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="set-stack"
          >
            <motion.div
              variants={staggerItem}
              className={`set-card${isScreeningActive ? " elevated" : ""}`}
            >
              <div className="set-block">
                <div className="set-ico">
                  {isScreeningActive ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                </div>
                <div className="set-text">
                  <span className="set-title">
                    Sage Guard
                    <span className={`pill ${isScreeningActive ? "safe" : "watch"}`}>
                      <span className="dot" />
                      {isScreeningActive ? "ACTIVE" : "PAUSED"}
                    </span>
                  </span>
                  <span className="set-sub">AI screening every signature before it leaves your wallet.</span>
                </div>
                <button
                  className={`toggle${screeningMode ? " on" : ""}`}
                  onClick={handleToggle}
                  disabled={toggling}
                  aria-label="Toggle screening"
                />
              </div>

              <div className="set-inset">
                <div className={`set-inset-ico${fullyActivated ? "" : " amber"}`}>
                  {fullyActivated ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                </div>
                <div>
                  <div className="set-inset-lbl">
                    {fullyActivated ? "Telegram alerts" : "Setup required"}
                  </div>
                  <div className="set-inset-meta">
                    {fullyActivated
                      ? `${tgDisplayName ?? "Connected"} · notifications active`
                      : "Link Telegram to enable the agent"}
                  </div>
                </div>
                <button className="manage-btn" onClick={() => setActivationOpen(true)}>
                  {fullyActivated ? "Manage" : "Activate"}
                </button>
              </div>
            </motion.div>

            {/* Warning when screening is disabled but setup is complete */}
            <AnimatePresence>
              {fullyActivated && !screeningMode && (
                <motion.div
                  key="warn"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25 }}
                  className="st-warn"
                >
                  <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Transactions will execute immediately without AI review. Make sure you trust all destinations.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── App settings ── */}
            <motion.div variants={staggerItem} className="set-divider">
              <span>App</span>
            </motion.div>

            <motion.div variants={staggerItem} className="set-rows">
              {/* Appearance */}
              <div className="set-row">
                <div className="set-row-label">
                  <span className="set-row-key">Appearance</span>
                  <span className="set-row-sub">Color scheme for this device</span>
                </div>
                <div className="set-theme-btns">
                  {THEME_OPTIONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      className={`set-theme-btn${themePref === id ? " on" : ""}`}
                      onClick={() => setThemePref(id)}
                      title={label}
                    >
                      <Icon size={12} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Block Explorer */}
              <div className="set-row">
                <div className="set-row-label">
                  <span className="set-row-key">Block Explorer</span>
                  <span className="set-row-sub">Where transaction links open</span>
                </div>
                <div className="set-select-wrap">
                  <select
                    className="set-select"
                    value={explorer}
                    onChange={(e) => setExplorer(e.target.value as Explorer)}
                  >
                    {EXPLORERS.map((exp) => (
                      <option key={exp.id} value={exp.id}>{exp.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
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
    </div>
  );
}
