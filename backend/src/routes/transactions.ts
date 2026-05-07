import { Router, type Request, type Response, type IRouter } from "express";
import {
  getProposalsByVault,
  getProposal,
  getLastInReviewProposal,
  updateProposal,
} from "../lib/supabase/index.js";
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

const PROPOSAL_DEFAULTS = {
  riskScore: null, riskVerdict: null, riskReasons: null,
  inReview: false, reviewReason: null, reviewedAt: null,
  rejected: false, rejectedAt: null, rejectReason: null,
  amountUSD: null, screeningDisabled: true,
} as const;

/** Pure Zerion-only item — on-chain tx with no matching proposal in DB */
function zerionOnlyToActivity(z: ZerionHistoryItem, vaultAddress: string): ProposalWithActivity {
  return {
    ...PROPOSAL_DEFAULTS,
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

export function createTransactionsRouter(): IRouter {
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
        (a, b) =>
          new Date(b.executedAt ?? b.proposedAt).getTime() -
          new Date(a.executedAt ?? a.proposedAt).getTime()
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

  /**
   * PATCH /transactions/:id
   * Use id = "latest" + body.vaultAddress to target the most recent in-review proposal.
   * Body: { action: "review" | "reject" | "executed", reason?, txSignature? }
   */
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { action, reason, vaultAddress, txSignature } = req.body ?? {};

      if (!action || !["review", "reject", "executed"].includes(action)) {
        res.status(400).json({ error: "action must be 'review', 'reject', or 'executed'" });
        return;
      }

      let id = req.params.id;
      if (id === "latest") {
        if (!vaultAddress) {
          res.status(400).json({ error: "vaultAddress required when id=latest" });
          return;
        }
        const latest = await getLastInReviewProposal(vaultAddress);
        if (!latest) {
          res.status(404).json({ error: "No in-review proposal found for this vault" });
          return;
        }
        id = latest.id;
      }

      const tx = await getProposal(id);
      if (!tx) {
        res.status(404).json({ error: `Transaction not found: ${id}` });
        return;
      }

      if (action === "review") {
        await updateProposal(id, {
          in_review: true,
          review_reason: reason ?? "Flagged for manual review",
          reviewed_at: new Date().toISOString(),
        });
        res.json({ status: "marked_review", proposalId: id });
      } else if (action === "reject") {
        await updateProposal(id, {
          rejected: true,
          rejected_at: new Date().toISOString(),
          reject_reason: reason ?? "Rejected by owner",
          in_review: false,
          status: "rejected",
        });
        res.json({ status: "rejected", proposalId: id, to: tx.to, amount: tx.amount });
      } else {
        // executed — called by client after sponsor/send succeeds
        await updateProposal(id, {
          status: "executed",
          executed_at: new Date().toISOString(),
          tx_signature: txSignature ?? null,
          in_review: false,
        });
        res.json({ status: "executed", proposalId: id, txSignature });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
