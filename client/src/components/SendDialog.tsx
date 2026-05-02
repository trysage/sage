"use client";

import { useState, useEffect, useRef } from "react";
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { Dialog } from "./Dialog";
import { TokenRow } from "./TokenRow";
import { useAuth } from "@/app/context/AuthContext";
import { proposeAndExecuteSponsored, loadSageAccount } from "@/lib/squads";
import type { TokenPosition } from "@/lib/api";

type Phase = "form" | "pick" | "sending" | "success";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidSolanaAddress(addr: string): boolean {
  return BASE58_RE.test(addr);
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

function fmtBalance(balance: string, symbol: string): string {
  const n = parseFloat(balance);
  if (isNaN(n)) return `0 ${symbol}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${symbol}`;
  if (n >= 1_000) return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${symbol}`;
  return `${parseFloat(n.toFixed(6))} ${symbol}`;
}

function fmtUSD(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price < 0.0001) return `$${price.toExponential(2)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const [recipient, setRecipient] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  // Reset when dialog fully closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPhase("form");
        setTxSig(null);
        setError(null);
        setRecipient("");
        setResolvedAddress(null);
        setResolveError(null);
        setAmount("");
        setSelectedToken(null);
      }, 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Default selection: prefer SOL
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens.find(t => t.symbol === "SOL") ?? tokens[0]);
    }
  }, [tokens, selectedToken]);

  // Debounced SNS resolution
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const val = recipient.trim();
    setResolvedAddress(null);
    setResolveError(null);
    if (resolveTimer.current) clearTimeout(resolveTimer.current);

    if (val.endsWith(".sol")) {
      resolveTimer.current = setTimeout(async () => {
        setResolving(true);
        const result = await resolveSnsName(val);
        setResolving(false);
        if (result) setResolvedAddress(result);
        else setResolveError("Name not found");
      }, 600);
    }

    return () => { if (resolveTimer.current) clearTimeout(resolveTimer.current); };
  }, [recipient]);

  const isSol = selectedToken?.symbol === "SOL";
  const maxBalance = selectedToken ? parseFloat(selectedToken.balance) : 0;
  const amountNum = parseFloat(amount);
  const recipientFinal =
    resolvedAddress ??
    (isValidSolanaAddress(recipient.trim()) ? recipient.trim() : null);
  const isValidAmount = !isNaN(amountNum) && amountNum > 0 && amountNum <= maxBalance;
  const canSend = recipientFinal !== null && isValidAmount && isSol;
  const amountUSD =
    selectedToken && !isNaN(amountNum) && amountNum > 0
      ? amountNum * selectedToken.price
      : null;

  async function handleSend() {
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
      const lamports = BigInt(Math.round(amountNum * LAMPORTS_PER_SOL));

      const ix = SystemProgram.transfer({
        fromPubkey: vaultPda,
        toPubkey: new PublicKey(recipientFinal!),
        lamports,
      });

      const sig = await proposeAndExecuteSponsored(
        connection,
        solanaWallet,
        multisigPda,
        [ix],
        `send: ${amount} SOL`
      );

      setTxSig(sig);
      setPhase("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("form");
    }
  }

  const dialogTitle =
    phase === "pick" ? "Select asset" : "Send";

  return (
    <Dialog
      open={open}
      onClose={phase === "sending" ? () => {} : onClose}
      title={dialogTitle}
    >
      {/* ── Token picker ── */}
      {phase === "pick" && (
        <div className="sdlg-picker">
          <button
            className="sdlg-back"
            onClick={() => setPhase("form")}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="t-list sdlg-pick-list">
            {tokens.map(tok => (
              <TokenRow
                key={tok.id}
                name={tok.name}
                symbol={tok.symbol}
                iconUrl={tok.iconUrl}
                amount={fmtBalance(tok.balance, tok.symbol)}
                price={fmtPrice(tok.price)}
                value={tok.usdValue != null ? fmtUSD(tok.usdValue) : "—"}
                onClick={() => {
                  setSelectedToken(tok);
                  setAmount("");
                  setPhase("form");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Send form ── */}
      {phase === "form" && (
        <div className="sdlg-body">
          {/* Asset selector */}
          <div className="sdlg-section">
            <label className="sdlg-label">Asset</label>
            <button className="sdlg-token-sel" onClick={() => setPhase("pick")}>
              <div className="sdlg-tok-ico-wrap">
                {selectedToken?.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedToken.iconUrl}
                    alt={selectedToken.symbol}
                    className="sdlg-tok-ico"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                ) : (
                  <span className="sdlg-tok-letter">
                    {selectedToken ? selectedToken.name.charAt(0) : "?"}
                  </span>
                )}
              </div>
              <div className="sdlg-tok-info">
                <span className="sdlg-tok-name">
                  {selectedToken ? selectedToken.name : "Select asset"}
                </span>
                {selectedToken && (
                  <span className="sdlg-tok-bal">
                    {fmtBalance(selectedToken.balance, selectedToken.symbol)}
                  </span>
                )}
              </div>
              <span className="sdlg-sel-arrow">›</span>
            </button>
            {selectedToken && !isSol && (
              <p className="sdlg-warn">Only SOL transfers are supported right now</p>
            )}
          </div>

          {/* Recipient */}
          <div className="sdlg-section">
            <label className="sdlg-label">To</label>
            <input
              className="sdlg-input"
              placeholder="Wallet address or .sol name"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            {resolving && (
              <span className="sdlg-addr-hint">Resolving…</span>
            )}
            {resolvedAddress && (
              <span className="sdlg-addr-resolved">
                ✓ {resolvedAddress.slice(0, 6)}…{resolvedAddress.slice(-4)}
              </span>
            )}
            {resolveError && (
              <span className="sdlg-addr-err">{resolveError}</span>
            )}
          </div>

          {/* Amount */}
          <div className="sdlg-section">
            <div className="sdlg-amt-head">
              <label className="sdlg-label">Amount</label>
              {selectedToken && (
                <button
                  className="sdlg-max"
                  onClick={() => setAmount(maxBalance.toFixed(6))}
                >
                  MAX
                </button>
              )}
            </div>
            <div className="sdlg-amt-row">
              <input
                className="sdlg-input sdlg-amt-input"
                type="number"
                placeholder="0.000000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                step="any"
              />
              {selectedToken && (
                <span className="sdlg-amt-sym">{selectedToken.symbol}</span>
              )}
            </div>
            {amountUSD != null && (
              <span className="sdlg-usd">≈ {fmtUSD(amountUSD)}</span>
            )}
          </div>

          {error && <div className="sdlg-error">{error}</div>}

          <button
            className="sdlg-send-btn"
            disabled={!canSend}
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      )}

      {/* ── Sending ── */}
      {phase === "sending" && (
        <div className="sdlg-state">
          <Loader2 size={36} className="sdlg-spinner" />
          <p className="sdlg-state-title">Sending…</p>
          <span className="sdlg-state-hint">Sign in your wallet when prompted</span>
        </div>
      )}

      {/* ── Success ── */}
      {phase === "success" && (
        <div className="sdlg-state">
          <CheckCircle2 size={36} className="sdlg-ok-ic" />
          <p className="sdlg-state-title">Sent!</p>
          {txSig && (
            <a
              href={`https://explorer.solana.com/tx/${txSig}`}
              target="_blank"
              rel="noreferrer"
              className="sdlg-explorer"
            >
              View on Explorer ↗
            </a>
          )}
          <button className="sdlg-send-btn" onClick={onClose}>
            Done
          </button>
        </div>
      )}
    </Dialog>
  );
}
