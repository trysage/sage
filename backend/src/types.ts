/**
 * App-level types (camelCase). DB row types live in lib/supabase/types.ts.
 */

export type ProposalStatus =
  | "pending"
  | "active"
  | "approved"
  | "executed"
  | "rejected"
  | "cancelled";

/** A Squads multisig proposal stored in our DB, augmented with a resolved status. */
export interface MultisigProposal {
  id: string;
  multisigAddress: string;
  vaultAddress: string;
  proposalIndex: number | null;
  /** Destination address for the transfer */
  to: string | null;
  amount: string | null;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  tokenIconUrl: string | null;
  proposedBy: string | null;
  proposedAt: string;
  executedAt: string | null;
  /** Solana transaction signature */
  txSignature: string | null;
  status: ProposalStatus;
}

/** A proposal record enriched with Zerion on-chain data. */
export interface ProposalWithActivity extends MultisigProposal {
  /**
   * "sage-only"    — proposal exists in our DB but no matching Zerion record
   * "zerion-only"  — on-chain tx found by Zerion with no matching proposal in DB
   * "both"         — matched on txSignature; Zerion token details merged in
   */
  source: "sage-only" | "zerion-only" | "both";
  direction?: "send" | "receive";
  operationType?: string;
  valueUSD?: number | null;
  tradeReceived?: { symbol: string; amount: string; iconUrl: string };
}
