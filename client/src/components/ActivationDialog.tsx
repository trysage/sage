"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  XIcon,
} from "lucide-react";
import { Dialog } from "./Dialog";

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "https://t.me/sage_guard_bot";
const BOT_HANDLE = "@" + BOT_URL.replace(/^https?:\/\/t\.me\//, "");

type StepState = "idle" | "running" | "done";

export interface ActivationDialogProps {
  open: boolean;
  onClose: () => void;
  telegramLinked: boolean;
  botConnected: boolean;
  linkingTelegram: boolean;
  botActivationInitiated: boolean;
  isCheckingBotConnection: boolean;
  tgDisplayName: string | null;
  onLinkTelegram: () => void;
  onStartBotActivation: () => void;
  onCheckBotConnection: () => void;
  onUnlinkTelegram: () => void;
}

function StepIndicator({ step, state }: { step: number; state: StepState }) {
  if (state === "done") {
    return (
      <motion.div
        key="done"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
        className="w-10 h-10 rounded-[14px] bg-mint-400/10 flex items-center justify-center shrink-0"
      >
        <CheckCircle2 className="h-5 w-5 text-mint-400" />
      </motion.div>
    );
  }

  if (state === "running") {
    return (
      <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-[14px] border-2 border-mint-400/30"
          animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
        <div className="relative w-10 h-10 rounded-[14px] bg-mint-400/8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-mint-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-[14px] bg-white/5 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-ink-300">{step}</span>
    </div>
  );
}

interface StepCardProps {
  step: number;
  state: StepState;
  title: string;
  idleDescription: string;
  runningDescription: React.ReactNode;
  doneDescription: React.ReactNode;
  actionLabel: string;
  actionLoading?: boolean;
  onAction: () => void;
  rightSlot?: React.ReactNode;
  disabled?: boolean;
  icon: React.ReactNode;
}

function StepCard({
  step,
  state,
  title,
  idleDescription,
  runningDescription,
  doneDescription,
  actionLabel,
  actionLoading,
  onAction,
  rightSlot,
  disabled,
  icon,
}: StepCardProps) {
  return (
    <div
      className={clsx(
        "p-4 rounded-[14px] transition-colors duration-300",
        state === "done" && "bg-mint-400/[0.06]",
        state === "running" && "bg-mint-400/[0.06]",
        state === "idle" && "bg-white/[0.03]",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        <StepIndicator step={step} state={state} />
        <div className="flex-1 min-w-0 flex flex-row justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="text-sm font-semibold text-ink-0 truncate">{title}</h4>
            </div>
            <div className="text-[11px] text-ink-300 mt-1 leading-relaxed min-h-[1.5em] max-w-48">
              {state === "done"
                ? doneDescription
                : state === "running"
                ? runningDescription
                : idleDescription}
            </div>
          </div>
          {state !== "done" && (
            <button
              onClick={onAction}
              disabled={actionLoading || disabled}
              className="px-3 py-1.5 text-[11px] font-medium rounded-[8px] bg-mint-400/10 text-mint-400 hover:bg-mint-400/15 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-default inline-flex items-center gap-1.5"
            >
              {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {actionLabel}
            </button>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}

function SuccessSplash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center py-6"
    >
      <div className="relative w-20 h-20 flex items-center justify-center mb-4">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-mint-400/50"
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-mint-400/30"
          animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
          className="relative w-16 h-16 rounded-full bg-mint-400/12 flex items-center justify-center"
        >
          <ShieldCheck className="h-8 w-8 text-mint-400" />
        </motion.div>
      </div>
      <h3 className="text-base font-semibold text-ink-0 tracking-[-0.01em]">Sage Guard Activated</h3>
      <p className="text-xs text-ink-300 mt-1.5 text-center leading-relaxed">
        Your AI agent is ready to screen transactions
      </p>
      <button
        onClick={onDone}
        className="mt-6 px-5 py-2 text-xs font-semibold rounded-[10px] bg-mint-400/12 text-mint-400 hover:bg-mint-400/18 transition-all cursor-pointer"
      >
        Done
      </button>
    </motion.div>
  );
}

export function ActivationDialog({
  open,
  onClose,
  telegramLinked,
  botConnected,
  linkingTelegram,
  botActivationInitiated,
  isCheckingBotConnection,
  tgDisplayName,
  onLinkTelegram,
  onStartBotActivation,
  onCheckBotConnection,
  onUnlinkTelegram,
}: ActivationDialogProps) {
  const wasInitiallyCompleteRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      wasInitiallyCompleteRef.current = telegramLinked && botConnected;
      setShowSuccess(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (telegramLinked && botConnected && !wasInitiallyCompleteRef.current) {
      setShowSuccess(true);
    }
  }, [open, telegramLinked, botConnected]);

  const step1State: StepState = telegramLinked
    ? "done"
    : linkingTelegram
    ? "running"
    : "idle";

  const step2State: StepState = botConnected
    ? "done"
    : botActivationInitiated
    ? "running"
    : "idle";

  const step2Disabled = !telegramLinked;

  return (
    <Dialog open={open} onClose={onClose} title="Activate Sage Guard">
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <SuccessSplash onDone={onClose} />
        ) : (
          <motion.div
            key="steps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <p className="text-xs text-ink-300 leading-relaxed -mt-1 mb-4 text-center">
              Complete these 2 steps so your AI agent can notify you about
              transactions that need review.
            </p>

            <StepCard
              step={1}
              state={step1State}
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              title="Link Telegram"
              idleDescription="Connect your Telegram account to receive notifications."
              runningDescription="Waiting for you to finish linking in the Privy popup…"
              doneDescription={
                <span className="text-mint-400">
                  {tgDisplayName ? ` ${tgDisplayName}` : "Telegram connected"}
                </span>
              }
              actionLabel={linkingTelegram ? "Connecting..." : "Connect Telegram"}
              actionLoading={linkingTelegram}
              onAction={onLinkTelegram}
              rightSlot={
                telegramLinked ? (
                  <button
                    onClick={onUnlinkTelegram}
                    className="px-2 py-1 text-[11px] font-medium rounded-[7px] bg-white/5 text-danger hover:bg-white/8 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <XIcon className="h-3 w-3" />
                    Unlink
                  </button>
                ) : undefined
              }
            />

            <StepCard
              step={2}
              state={step2State}
              icon={<Send className="h-3.5 w-3.5" />}
              title="Link the Agent"
              idleDescription={`Open ${BOT_HANDLE} and send a "Connect to Sage" message.`}
              runningDescription={
                <>
                  Listening for your message on{" "}
                  <a
                    href={BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mint-400/80 hover:text-mint-400 transition-colors underline underline-offset-2"
                  >
                    {BOT_HANDLE}
                  </a>
                  …
                </>
              }
              doneDescription={
                <span className="text-mint-400">Bot connected</span>
              }
              actionLabel={botActivationInitiated ? "Check again" : "Activate"}
              actionLoading={isCheckingBotConnection}
              onAction={
                botActivationInitiated ? onCheckBotConnection : onStartBotActivation
              }
              disabled={step2Disabled}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
