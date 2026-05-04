"use client";

import { useState, useEffect, useRef } from "react";
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { ChevronDown, ArrowUpRight, UserRound, X, Coins } from "lucide-react";
import { SuccessAnimation } from "./animations/SuccessAnimation";
import { EmptyTokens } from "./empty";
import { Orbital } from "./loaders/Orbital";
import { Dialog } from "./Dialog";
import { TokenRow } from "./TokenRow";
import { useAuth } from "@/app/context/AuthContext";
import { proposeAndExecuteSponsored, loadSageAccount } from "@/lib/squads";
import { useTokenAmountInput } from "@/hooks/useTokenAmountInput";
import type { TokenPosition } from "@/lib/api";

type Phase = "form" | "sending" | "success";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidSolanaAddress(s: string) { return BASE58_RE.test(s); }

function truncate(addr: string) {
  return addr.length > 20 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

function parseSendError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/insufficient lamports/i.test(msg)) return "Insufficient balance in vault";
  if (/insufficient funds/i.test(msg)) return "Insufficient balance in vault";
  if (/0x1\b/.test(msg) && /system program|11111111/i.test(msg)) return "Insufficient balance in vault";
  if (/owner does not match/i.test(msg)) return "Token account error — vault may not hold this token";
  if (/account not found/i.test(msg)) return "Token account not found";
  if (/user rejected/i.test(msg) || /rejected the request/i.test(msg)) return "Transaction rejected in wallet";
  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}

async function resolveSnsName(name: string): Promise<string | null> {
  try {
    const domain = name.replace(/\.sol$/, "");
    const res = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${domain}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.s === "ok" ? (data.result as string) : null;
  } catch {
    return null;
  }
}

function fmtTokenAmount(balance: string) {
  const n = parseFloat(balance);
  if (isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return parseFloat(n.toFixed(6)).toString();
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(p: number) {
  if (p === 0) return "$0.00";
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TokenIcon({ token }: { token: TokenPosition }) {
  if (token.iconUrl) {
    return (
      <span className="sdlg-token-ico">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={token.iconUrl}
          alt={token.symbol}
          onError={e => (e.currentTarget.style.display = "none")}
        />
      </span>
    );
  }
  return (
    <span className="sdlg-token-ico">
      <span className="sdlg-token-ico-letter">{token.name.charAt(0)}</span>
    </span>
  );
}

function TxTokenIcon({ token }: { token: TokenPosition }) {
  if (token.iconUrl) {
    return (
      <span className="sdlg-tx-ico">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={token.iconUrl}
          alt={token.symbol}
          onError={e => (e.currentTarget.style.display = "none")}
        />
      </span>
    );
  }
  return (
    <span className="sdlg-tx-ico">
      <span className="sdlg-tx-ico-letter">{token.name.charAt(0)}</span>
    </span>
  );
}

interface SendDialogProps {
  open: boolean;
  onClose: () => void;
  tokens: TokenPosition[];
}

export function SendDialog({ open, onClose, tokens }: SendDialogProps) {
  const { wallet, getSolanaWallet } = useAuth();

  const [phase, setPhase] = useState<Phase>("form");
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedToken, setSelectedToken] = useState<TokenPosition | null>(null);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const {
    mode: amountMode,
    inputValue: amountInputValue,
    tokenAmount,
    secondaryDisplay: amountSecondary,
    setInputValue: setAmountInput,
    toggleMode: toggleAmountMode,
    setTokenAmountDirect,
    reset: resetAmount,
  } = useTokenAmountInput(
    selectedToken?.price ?? 0,
    selectedToken?.symbol ?? "",
    selectedToken?.decimals ?? 9,
  );

  // Reset after dialog closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("form");
        setTxSig(null);
        setError(null);
        setRecipient("");
        setResolvedAddress(null);
        setResolvedName(null);
        setResolveError(null);
        resetAmount();
        setSelectedToken(null);
        setTokenPickerOpen(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [open, resetAmount]);

  // Default to SOL (skip placeholder tokens)
  useEffect(() => {
    const sendable = tokens.filter(t => !t.placeholder);
    if (sendable.length > 0 && !selectedToken) {
      setSelectedToken(sendable.find(t => t.symbol === "SOL") ?? sendable[0]);
    }
  }, [tokens, selectedToken]);

  // Reset amount on token change
  const prevTokenId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedToken && selectedToken.id !== prevTokenId.current) {
      prevTokenId.current = selectedToken.id;
      resetAmount();
    }
  }, [selectedToken, resetAmount]);

  // SNS resolution debounce
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const val = recipient.trim();
    setResolveError(null);

    if (resolveTimer.current) clearTimeout(resolveTimer.current);

    if (!val) {
      setResolvedAddress(null);
      setResolvedName(null);
      return;
    }

    // Raw address — accept immediately
    if (isValidSolanaAddress(val)) {
      setResolvedAddress(val);
      setResolvedName(null);
      return;
    }

    // .sol domain — debounced resolve
    if (val.endsWith(".sol")) {
      resolveTimer.current = setTimeout(async () => {
        setResolving(true);
        const result = await resolveSnsName(val);
        setResolving(false);
        if (result) {
          setResolvedAddress(result);
          setResolvedName(val);
        } else {
          setResolvedAddress(null);
          setResolvedName(null);
          setResolveError("Name not found");
        }
      }, 600);
    } else {
      setResolvedAddress(null);
      setResolvedName(null);
    }

    return () => { if (resolveTimer.current) clearTimeout(resolveTimer.current); };
  }, [recipient]);

  const clearRecipient = () => {
    setRecipient("");
    setResolvedAddress(null);
    setResolvedName(null);
    setResolveError(null);
  };

  const isSol = selectedToken?.symbol === "SOL";
  const maxBalance = selectedToken ? parseFloat(selectedToken.balance) : 0;
  const amountNum = parseFloat(tokenAmount) || 0;
  const insufficientFunds = amountNum > 0 && amountNum > maxBalance;
  const canSend =
    resolvedAddress !== null &&
    amountNum > 0 &&
    !insufficientFunds &&
    selectedToken !== null;

  const applyMax = () => {
    if (!selectedToken) return;
    const raw = selectedToken.balance;
    const trimmed = raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
    setTokenAmountDirect(trimmed || "0");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || !wallet?.address) return;
    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) return;
    const account = loadSageAccount(wallet.address);
    if (!account) return;

    setPhase("sending");
    setError(null);

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const { vaultPda, multisigPda } = account;
      const recipientPubkey = new PublicKey(resolvedAddress!);

      let instructions;
      let memo: string;

      if (isSol) {
        const lamports = BigInt(Math.round(amountNum * LAMPORTS_PER_SOL));
        instructions = [
          SystemProgram.transfer({
            fromPubkey: vaultPda,
            toPubkey: recipientPubkey,
            lamports,
          }),
        ];
        memo = `send: ${tokenAmount} SOL`;
      } else {
        const mintPubkey = new PublicKey(selectedToken!.address);
        const vaultAta = getAssociatedTokenAddressSync(mintPubkey, vaultPda, true);
        const recipientAta = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey, false);
        const tokenUnits = BigInt(Math.round(amountNum * Math.pow(10, selectedToken!.decimals)));

        instructions = [
          // Create recipient ATA if it doesn't exist (idempotent — safe to always include)
          createAssociatedTokenAccountIdempotentInstruction(
            vaultPda,
            recipientAta,
            recipientPubkey,
            mintPubkey,
          ),
          createTransferCheckedInstruction(
            vaultAta,
            mintPubkey,
            recipientAta,
            vaultPda,
            tokenUnits,
            selectedToken!.decimals,
          ),
        ];
        memo = `send: ${tokenAmount} ${selectedToken!.symbol}`;
      }

      const sig = await proposeAndExecuteSponsored(
        connection,
        solanaWallet,
        multisigPda,
        instructions,
        memo
      );

      setTxSig(sig);
      setPhase("success");
    } catch (err) {
      setError(parseSendError(err));
      setPhase("form");
    }
  }

  // Snapshot for state screens
  const sendingTo = resolvedAddress ?? "";
  const sendingAmount = tokenAmount;
  const sendingToken = selectedToken;

  return (
    <>
      {/* Main send dialog — rendered first so the picker (below) stacks on top */}
      <Dialog
        open={open}
        onClose={phase === "sending" ? () => {} : onClose}
        title="Send"
      >
        {/* ── Sending state ── */}
        {phase === "sending" && sendingToken && (
          <div className="sdlg-state">
            <div className="sdlg-state-head">
              <div style={{ transform: "scale(0.65)", transformOrigin: "center" }}>
                <Orbital />
              </div>
              <p className="sdlg-state-label">Sending…</p>
              <p className="sdlg-state-sub">Sign in your wallet when prompted</p>
            </div>
            <div className="sdlg-tx-card">
              <div className="sdlg-tx-arrow"><ArrowUpRight size={20} /></div>
              <TxTokenIcon token={sendingToken} />
              <span className="sdlg-tx-amount">
                {sendingAmount} {sendingToken.symbol}
              </span>
            </div>
            <dl className="sdlg-dl">
              <div className="sdlg-dl-row">
                <dt>To</dt>
                <dd title={sendingTo}>{truncate(sendingTo)}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* ── Success state ── */}
        {phase === "success" && sendingToken && (
          <div className="sdlg-state">
            <div className="sdlg-state-head">
              <SuccessAnimation size={120} loop={false} />
              <span className="sdlg-state-label">Sent!</span>
            </div>
            <div className="sdlg-tx-card">
              <div className="sdlg-tx-arrow"><ArrowUpRight size={20} /></div>
              <TxTokenIcon token={sendingToken} />
              <span className="sdlg-tx-amount">
                {sendingAmount} {sendingToken.symbol}
              </span>
            </div>
            <dl className="sdlg-dl">
              <div className="sdlg-dl-row">
                <dt>To</dt>
                <dd title={sendingTo}>{truncate(sendingTo)}</dd>
              </div>
            </dl>
            {txSig && (
              <a
                href={`https://explorer.solana.com/tx/${txSig}`}
                target="_blank"
                rel="noreferrer"
                className="sdlg-explorer-btn"
              >
                View on Explorer ↗
              </a>
            )}
            <button className="sdlg-submit" onClick={onClose}>Done</button>
          </div>
        )}

        {/* ── Form ── */}
        {phase === "form" && (
          <form className="sdlg-body" onSubmit={handleSubmit}>

            {/* 1. Amount — big input first */}
            <div className="sdlg-field">
              <label className="sdlg-field-label">You&apos;re sending</label>
              <div className="sdlg-amount-row">
                {amountMode === "usd" && <span className="sdlg-amount-prefix">$</span>}
                <input
                  className="sdlg-amount-input"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={amountInputValue}
                  onChange={e => setAmountInput(e.target.value)}
                />
              </div>
              {amountSecondary ? (
                <button type="button" className="sdlg-amount-secondary" onClick={toggleAmountMode}>
                  {amountSecondary}
                </button>
              ) : selectedToken?.price ? (
                <button type="button" className="sdlg-amount-secondary sdlg-amount-hint" onClick={toggleAmountMode}>
                  {amountMode === "token" ? "Switch to $" : `Switch to ${selectedToken.symbol}`}
                </button>
              ) : null}
              <div className="sdlg-amount-meta">
                <span className="sdlg-amount-bal">
                  Balance:{" "}
                  {selectedToken
                    ? `${fmtTokenAmount(selectedToken.balance)} ${selectedToken.symbol}`
                    : "--"}
                </span>
                <button
                  type="button"
                  className="sdlg-max"
                  onClick={applyMax}
                  disabled={!selectedToken || maxBalance <= 0}
                >
                  MAX
                </button>
              </div>
              {insufficientFunds && (
                <span className="sdlg-insuf">Insufficient funds</span>
              )}
            </div>

            {/* 2. Token selector */}
            <div className="sdlg-field">
              <label className="sdlg-field-label">Token</label>
              <button
                type="button"
                className="sdlg-token-btn"
                onClick={() => setTokenPickerOpen(true)}
              >
                {selectedToken ? (
                  <>
                    <TokenIcon token={selectedToken} />
                    <div className="sdlg-token-info">
                      <p className="sdlg-token-sym">{selectedToken.symbol}</p>
                      <p className="sdlg-token-bal">
                        {fmtTokenAmount(selectedToken.balance)} {selectedToken.symbol}
                        {selectedToken.usdValue != null &&
                          ` · ${fmtUSD(selectedToken.usdValue)}`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="sdlg-token-info">
                    <p className="sdlg-token-sym">Select token</p>
                    <p className="sdlg-token-bal">Tap to choose</p>
                  </div>
                )}
                <ChevronDown size={20} className="sdlg-token-chev" />
              </button>
            </div>

            {/* 3. Recipient */}
            <div className="sdlg-field">
              <label className="sdlg-field-label">To</label>
              {resolvedAddress && !resolving ? (
                <div className="sdlg-recip-card">
                  <div className="sdlg-recip-avatar">
                    <UserRound size={20} />
                  </div>
                  <div className="sdlg-recip-info">
                    {resolvedName ? (
                      <>
                        <p className="sdlg-recip-name">{resolvedName}</p>
                        <p className="sdlg-recip-addr" title={resolvedAddress}>
                          {truncate(resolvedAddress)}
                        </p>
                      </>
                    ) : (
                      <p className="sdlg-recip-name" title={resolvedAddress}>
                        {truncate(resolvedAddress)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Clear recipient"
                    className="sdlg-recip-clear"
                    onClick={clearRecipient}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <input
                  className="sdlg-recip-input"
                  type="text"
                  placeholder="Address or .sol name"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              )}
              {resolving && <span className="sdlg-resolving">Resolving…</span>}
              {resolveError && !resolving && recipient.trim() && (
                <span className="sdlg-resolve-err">{resolveError}</span>
              )}
            </div>

            {error && <p className="sdlg-error">{error}</p>}

            <button type="submit" className="sdlg-submit" disabled={!canSend}>
              {canSend ? "Send" : resolvedAddress ? "Enter amount" : "Select recipient"}
            </button>
          </form>
        )}
      </Dialog>

      {/* Token picker — rendered after main dialog so it stacks on top (same z-index, later DOM wins) */}
      <Dialog
        open={tokenPickerOpen}
        onClose={() => setTokenPickerOpen(false)}
        title="Select token"
      >
        <div className="sdlg-picker-head">
          <Coins size={14} className="sdlg-picker-head-icon" />
          <span className="sdlg-picker-title">
            <span className="sdlg-picker-arrow">› </span>Tokens
          </span>
        </div>
        {tokens.filter(t => !t.placeholder).length === 0 ? (
          <EmptyTokens />
        ) : (
          <div className="t-list" style={{ margin: "0 -4px" }}>
            {tokens.filter(t => !t.placeholder).map((t) => (
              <TokenRow
                key={t.id}
                name={t.name}
                symbol={t.symbol}
                iconUrl={t.iconUrl}
                amount={`${fmtTokenAmount(t.balance)} ${t.symbol}`}
                price={fmtPrice(t.price)}
                value={t.usdValue != null ? fmtUSD(t.usdValue) : "—"}
                onClick={() => {
                  setSelectedToken(t);
                  setTokenPickerOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}
