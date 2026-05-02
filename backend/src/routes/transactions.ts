import { Router, type Request, type Response } from "express";
import { getProposalsByVault, getProposal } from "../lib/supabase/index.js";
import { fetchTransfers, type ZerionHistoryItem } from "../lib/zerion.js";
import type { ProposalWithActivity, MultisigProposal } from "../types.js";

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

/** Pure Zerion-only item — on-chain tx with no matching proposal in DB */
function zerionOnlyToActivity(z: ZerionHistoryItem, vaultAddress: string): ProposalWithActivity {
  return {
    id: `zerion:${z.hash}`,
    multisigAddress: "",
    vaultAddress,
    proposalIndex: null,
    to: z.direction === "receive" ? z.from : z.to,
    amount: z.amount,
    tokenSymbol: z.token.symbol || null,
    tokenAddress: z.token.address || null,
    tokenIconUrl: z.token.iconUrl,
    proposedBy: vaultAddress,
    proposedAt: z.timestamp,
    executedAt: z.timestamp,
    txSignature: z.hash,
    status: "executed",
    source: "zerion-only",
    direction: z.direction,
    operationType: z.operationType,
    valueUSD: z.valueUSD,
    tradeReceived: z.received
      ? { symbol: z.received.token.symbol, amount: z.received.amount, iconUrl: z.received.token.iconUrl ?? "" }
      : undefined,
  };
}

/**
 * Merge Zerion op data into a Sage proposal record.
 * Zerion wins on token details (symbol, address, icon, amount, USD value)
 * since it reflects actual on-chain state rather than what was proposed.
 */
function mergeWithZerion(tx: MultisigProposal, z: ZerionHistoryItem): ProposalWithActivity {
  return {
    ...tx,
    source: "both",
    direction: z.direction,
    operationType: z.operationType,
    tokenSymbol: z.token.symbol || tx.tokenSymbol,
    tokenAddress: z.token.address || tx.tokenAddress,
    tokenIconUrl: z.token.iconUrl ?? tx.tokenIconUrl,
    amount: z.amount || tx.amount,
    valueUSD: z.valueUSD,
    tradeReceived: z.received
      ? { symbol: z.received.token.symbol, amount: z.received.amount, iconUrl: z.received.token.iconUrl ?? "" }
      : undefined,
    to: z.direction === "receive" ? z.from : tx.to,
  };
}

export function createTransactionsRouter(): Router {
  const router = Router();

  /**
   * GET /transactions?vaultAddress=<solana-pubkey>
   *
   * Returns merged proposal DB records + Zerion on-chain history.
   * Auth required.
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const vaultAddress = req.query.vaultAddress as string | undefined;
      if (!vaultAddress || !SOLANA_ADDRESS_RE.test(vaultAddress)) {
        res.status(400).json({ error: "Missing or invalid vaultAddress" });
        return;
      }

      // Fetch DB proposals and Zerion history in parallel; Zerion has a 4s timeout
      const [dbResult, zerionResult] = await Promise.allSettled([
        getProposalsByVault(vaultAddress),
        withTimeout(fetchTransfers(vaultAddress), 4000),
      ]);

      const dbProposals = dbResult.status === "fulfilled" ? dbResult.value : [];
      const zerionItems = zerionResult.status === "fulfilled" ? zerionResult.value : [];

      // Index Zerion items by signature for O(1) lookup
      const zerionByHash = new Map(zerionItems.map((z) => [z.hash.toLowerCase(), z]));

      // Process DB proposals: match against Zerion by txSignature
      const ourActivity: ProposalWithActivity[] = dbProposals.map((tx) => {
        const base: ProposalWithActivity = { ...tx, source: "sage-only" };
        if (!tx.txSignature) return base;
        const zerionMatch = zerionByHash.get(tx.txSignature.toLowerCase());
        return zerionMatch ? mergeWithZerion(tx, zerionMatch) : base;
      });

      // Zerion items with no matching proposal → "zerion-only"
      const ourSigs = new Set(
        dbProposals
          .filter((t) => t.txSignature)
          .map((t) => t.txSignature!.toLowerCase())
      );
      const zerionOnlyActivity: ProposalWithActivity[] = zerionItems
        .filter((z) => !ourSigs.has(z.hash.toLowerCase()))
        .map((z) => zerionOnlyToActivity(z, vaultAddress));

      const transactions = [...ourActivity, ...zerionOnlyActivity].sort(
        (a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime()
      );

      res.json({ transactions });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /**
   * GET /transactions/:id — fetch a single proposal by ID
   */
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tx = await getProposal(id);
      if (!tx) {
        res.status(404).json({ error: `Transaction not found: ${id}` });
        return;
      }
      res.json({ transaction: tx });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
