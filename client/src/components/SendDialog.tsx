"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { ChevronDown, ArrowUpRight, UserRound, X, Coins, MessageCircle } from "lucide-react";
import { PendingAnimation } from "./animations/PendingAnimation";
import { SuccessAnimation } from "./animations/SuccessAnimation";
import { EmptyTokens } from "./empty";
import { Orbital } from "./loaders/Orbital";
import { Dialog } from "./Dialog";
import { TokenRow } from "./TokenRow";
import { useAuth } from "@/app/context/AuthContext";
import { useScreeningStatus } from "@/app/context/ScreeningStatusContext";
import { proposeTransactionSponsored, loadSageAccount } from "@/lib/squads";
import { postQueue, executeProposal } from "@/lib/api";
import { useTokenAmountInput } from "@/hooks/useTokenAmountInput";
import { formatTokenAmount, formatUSD, formatPrice } from "@/lib/format";
import type { TokenPosition } from "@/lib/api";

type Phase = "form" | "proposing" | "reviewing" | "success";

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
  const router = useRouter();
  const { wallet, getSolanaWallet, identityToken } = useAuth();
  const { isScreeningActive, fullyActivated } = useScreeningStatus();

  const [phase, setPhase] = useState<Phase>("form");
  const [txSig, setTxSig] = useState<string | null>(null);
  const [proposedAt, setProposedAt] = useState<string | null>(null);
  const [showTgRequiredModal, setShowTgRequiredModal] = useState(false);
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
      }, phase === "reviewing" ? 0 : 350);
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

    // Gate: require full activation when screening is active
    if (isScreeningActive && !fullyActivated) {
      setShowTgRequiredModal(true);
      return;
    }

    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) return;
    const account = loadSageAccount(wallet.address);
    if (!account) return;

    setPhase("proposing");
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
          SystemProgram.transfer({ fromPubkey: vaultPda, toPubkey: recipientPubkey, lamports }),
        ];
        memo = `send: ${tokenAmount} SOL`;
      } else {
        const mintPubkey = new PublicKey(selectedToken!.address);
        const vaultAta = getAssociatedTokenAddressSync(mintPubkey, vaultPda, true);
        const recipientAta = getAssociatedTokenAddressSync(mintPubkey, recipientPubkey, false);
        const tokenUnits = BigInt(Math.round(amountNum * Math.pow(10, selectedToken!.decimals)));
        instructions = [
          createAssociatedTokenAccountIdempotentInstruction(vaultPda, recipientAta, recipientPubkey, mintPubkey),
          createTransferCheckedInstruction(vaultAta, mintPubkey, recipientAta, vaultPda, tokenUnits, selectedToken!.decimals),
        ];
        memo = `send: ${tokenAmount} ${selectedToken!.symbol}`;
      }

      // 1. Propose + approve on-chain (user signs via Privy)
      const txIndex = await proposeTransactionSponsored(connection, solanaWallet, multisigPda, instructions, memo);

      // 2. Register with backend queue for risk screening
      const amountUSD = selectedToken?.price && amountNum > 0
        ? (amountNum * selectedToken.price).toFixed(2)
        : undefined;

      const queueResult = await postQueue({
        multisigAddress: multisigPda.toBase58(),
        vaultAddress: vaultPda.toBase58(),
        proposalIndex: Number(txIndex),
        to: resolvedAddress!,
        amount: tokenAmount,
        amountUSD,
        tokenSymbol: selectedToken?.symbol,
        tokenAddress: isSol ? undefined : selectedToken?.address,
        tokenIconUrl: selectedToken?.iconUrl ?? undefined,
        proposedBy: wallet.address,
        screeningDisabled: !isScreeningActive,
      }, identityToken ?? undefined);

      if (!isScreeningActive) {
        // Screening off — execute immediately
        const execResult = await executeProposal(queueResult.id, identityToken ?? undefined);
        setTxSig(execResult.signature ?? null);
        setPhase("success");
      } else if (queueResult.autoApproved) {
        // AI approved and executed in one shot
        setTxSig(queueResult.signature ?? null);
        setPhase("success");
      } else {
        // Sent to Telegram for manual review
        setProposedAt(new Date().toISOString());
        setPhase("reviewing");
      }
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
        onClose={phase === "proposing" ? () => {} : onClose}
        title="Send"
      >
        {/* ── Proposing state ── */}
        {phase === "proposing" && sendingToken && (
          <div className="sdlg-state">
            <div className="sdlg-state-head">
              <div style={{ transform: "scale(0.65)", transformOrigin: "center" }}>
                <Orbital />
              </div>
              <p className="sdlg-state-label">Proposing…</p>
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

        {/* ── Reviewing state ── */}
        {phase === "reviewing" && sendingToken && (
          <div className="sdlg-state">
            <div className="sdlg-state-head">
              <PendingAnimation size={120} />
              <p className="sdlg-state-label" style={{ color: "var(--watch)" }}>Pending Review</p>
              <p className="sdlg-state-sub">Your Sage agent is reviewing this transaction. You&apos;ll receive a Telegram notification.</p>
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
              {proposedAt && (
                <div className="sdlg-dl-row">
                  <dt>Proposed</dt>
                  <dd>{new Date(proposedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</dd>
                </div>
              )}
            </dl>
            <button className="sdlg-submit" onClick={onClose}>Done</button>
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
                    ? `${formatTokenAmount(selectedToken.balance)} ${selectedToken.symbol}`
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
                        {formatTokenAmount(selectedToken.balance)} {selectedToken.symbol}
                        {selectedToken.usdValue != null &&
                          ` · ${formatUSD(selectedToken.usdValue) ?? ""}`}
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
              {canSend
                ? isScreeningActive ? "Propose" : "Send"
                : resolvedAddress ? "Enter amount" : "Select recipient"}
            </button>
          </form>
        )}
      </Dialog>

      {/* Telegram required modal */}
      <Dialog open={showTgRequiredModal} onClose={() => setShowTgRequiredModal(false)} title="Telegram Required">
        <div className="sdlg-tg-required">
          <div className="sdlg-tg-icon">
            <MessageCircle size={28} />
          </div>
          <p className="sdlg-tg-body">
            AI screening is active. Telegram must be connected so the agent can notify you when a transaction needs review.
          </p>
          <button
            className="sdlg-submit"
            onClick={() => { setShowTgRequiredModal(false); router.push("/settings"); }}
          >
            Go to Settings
          </button>
          <button
            className="sdlg-tg-cancel"
            onClick={() => setShowTgRequiredModal(false)}
          >
            Cancel
          </button>
        </div>
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
                amount={`${formatTokenAmount(t.balance)} ${t.symbol}`}
                price={formatPrice(t.price)}
                value={formatUSD(t.usdValue) ?? "—"}
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
