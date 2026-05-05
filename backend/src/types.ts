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

export interface MultisigProposal {
  id: string;
  multisigAddress: string;
  vaultAddress: string;
  proposalIndex: number | null;
  to: string | null;
  amount: string | null;
  tokenSymbol: string | null;
  tokenAddress: string | null;
  tokenIconUrl: string | null;
  proposedBy: string | null;
  proposedAt: string;
  executedAt: string | null;
  txSignature: string | null;
  status: ProposalStatus;
  // Risk + review lifecycle
  riskScore: number | null;
  riskVerdict: "APPROVE" | "REVIEW" | "BLOCK" | null;
  riskReasons: string[] | null;
  inReview: boolean;
  reviewReason: string | null;
  reviewedAt: string | null;
  rejected: boolean;
  rejectedAt: string | null;
  rejectReason: string | null;
  amountUSD: string | null;
  screeningDisabled: boolean;
}

export interface ProposalWithActivity extends MultisigProposal {
  source: "sage-only" | "zerion-only" | "both";
  direction?: "send" | "receive";
  operationType?: string;
  valueUSD?: number | null;
  tradeReceived?: { symbol: string; amount: string; iconUrl: string };
}

// ── Risk engine types ─────────────────────────────────────────────────────────

export interface RecipientProfile {
  label: string | null;
  totalTxCount: number;
  totalVolume: string;
  avgAmount: string;
  minAmount: string;
  maxAmount: string;
  stddevAmount: string;
  typicalHoursUtc: number[];
  typicalDaysOfWeek: number[];
  avgDaysBetweenTxs: number | null;
  category: string;
  trustLevel: "trusted" | "neutral" | "suspicious" | "blocked";
  firstSeen: string | null;
  lastSeen: string | null;
  customAttributes: Record<string, unknown>;
}

export interface DailyStatEntry {
  txCount: number;
  approvedCount: number;
  reviewedCount: number;
  rejectedCount: number;
  totalVolume: string;
  approvedVolume: string;
}

export interface TimePatternEntry {
  hourUtc: number;
  dayOfWeek: number;
  txCount: number;
  totalVolume: string;
  isAllowed: boolean | null;
}

export interface TokenPatternEntry {
  symbol: string | null;
  totalTxCount: number;
  totalVolume: string;
  avgAmount: string;
  maxAmount: string;
  isFamiliar: boolean;
  firstSeen: string | null;
  lastUsed: string | null;
}

export interface UserRule {
  id: string;
  name: string;
  ruleType:
    | "amount_limit"
    | "recipient_block"
    | "recipient_whitelist"
    | "time_restriction"
    | "velocity_limit"
    | "token_restriction"
    | "custom";
  conditions: Record<string, unknown>;
  action: "approve" | "review" | "block";
  riskScoreDelta: number;
  priority: number;
}

export interface PatternsFile {
  recipients: Record<string, RecipientProfile>;
  dailyStats: Record<string, DailyStatEntry>;
  timePatterns: Record<string, TimePatternEntry>;
  tokenPatterns: Record<string, TokenPatternEntry>;
  rules: UserRule[];
  velocity: {
    hourly: { txCount: number; totalVolume: string } | null;
    daily: { txCount: number; totalVolume: string } | null;
    weekly: { txCount: number; totalVolume: string } | null;
  };
  globalLimits: {
    maxSingleTx: string;
    maxHourlyVolume: string;
    maxDailyVolume: string;
    maxWeeklyVolume: string;
    maxDailyTxCount: number;
    allowedHoursUTC: number[];
    allowedDaysUTC: number[];
    unknownRecipientAction: "approve" | "review" | "block";
    riskThresholdApprove: number;
    riskThresholdBlock: number;
    learningEnabled: boolean;
  };
}

export interface RiskResult {
  riskScore: number;
  verdict: "APPROVE" | "REVIEW" | "BLOCK";
  reasons: string[];
  triggeredRules: string[];
}

/** Minimal tx shape needed by the risk engine — satisfied by MultisigProposal */
export interface RiskInput {
  to: string;
  amount: string;
  amountUSD?: string | null;
  token?: string | null;
  tokenAddress?: string | null;
}
