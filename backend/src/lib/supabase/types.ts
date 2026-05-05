/**
 * DB row types (snake_case) — mirror schema.sql column names exactly.
 * App types (camelCase) live in src/types.ts.
 */

export interface UserDetailsRow {
  vault_address: string;
  multisig_address: string | null;
  signer_address: string | null;
  email: string | null;
  name: string | null;
  username: string | null;
  telegram_id: string | null;
  telegram_chat_id: string | null;
  bot_connected: boolean | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface MultisigProposalRow {
  id: string;
  multisig_address: string;
  vault_address: string;
  proposal_index: number | null;
  to_address: string | null;
  amount: string | null;
  token_symbol: string | null;
  token_address: string | null;
  token_icon_url: string | null;
  proposed_by: string | null;
  proposed_at: string;
  executed_at: string | null;
  tx_signature: string | null;
  status: string;
  // Risk + review lifecycle
  risk_score: number | null;
  risk_verdict: "APPROVE" | "REVIEW" | "BLOCK" | null;
  risk_reasons: string[] | null;
  in_review: boolean;
  review_reason: string | null;
  reviewed_at: string | null;
  rejected: boolean;
  rejected_at: string | null;
  reject_reason: string | null;
  amount_usd: string | null;
  screening_disabled: boolean;
}

export interface UserSettingsRow {
  vault_address: string;
  screening_mode: boolean;
  last_check: string | null;
  telegram_chat_id: string | null;
  bot_connected: boolean | null;
  updated_at: string;
}

export interface GlobalLimitsRow {
  vault_address: string;
  max_single_tx: string;
  max_hourly_volume: string;
  max_daily_volume: string;
  max_weekly_volume: string;
  max_daily_tx_count: number;
  allowed_hours_utc: number[];
  allowed_days_utc: number[];
  unknown_recipient_action: "approve" | "review" | "block";
  risk_threshold_approve: number;
  risk_threshold_block: number;
  learning_enabled: boolean;
  updated_at: string;
}

export interface UserRuleRow {
  id: string;
  vault_address: string;
  name: string;
  description: string | null;
  rule_type:
    | "amount_limit"
    | "recipient_block"
    | "recipient_whitelist"
    | "time_restriction"
    | "velocity_limit"
    | "token_restriction"
    | "custom";
  conditions: Record<string, unknown>;
  action: "approve" | "review" | "block";
  risk_score_delta: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface RecipientProfileRow {
  address: string;
  vault_address: string;
  label: string | null;
  category: string;
  trust_level: "trusted" | "neutral" | "suspicious" | "blocked";
  total_tx_count: number;
  total_volume: string;
  avg_amount: string;
  min_amount: string;
  max_amount: string;
  stddev_amount: string;
  typical_hours_utc: number[] | null;
  typical_days_of_week: number[] | null;
  avg_days_between_txs: string | null;
  first_seen: string | null;
  last_seen: string | null;
  custom_attributes: Record<string, unknown>;
  notes: string | null;
  updated_at: string;
}

export interface TimePatternRow {
  vault_address: string;
  hour_utc: number;
  day_of_week: number;
  tx_count: number;
  total_volume: string;
  is_allowed: boolean | null;
}

export interface VelocityWindowRow {
  vault_address: string;
  window_type: "hourly" | "daily" | "weekly" | "monthly";
  window_start: string;
  tx_count: number;
  total_volume: string;
  updated_at: string;
}

export interface TokenPatternRow {
  vault_address: string;
  token_address: string;
  token_symbol: string | null;
  total_tx_count: number;
  total_volume: string;
  avg_amount: string;
  max_amount: string;
  is_familiar: boolean;
  first_seen: string | null;
  last_used: string | null;
  updated_at: string;
}

export interface DailyStatsRow {
  date: string;
  vault_address: string;
  tx_count: number;
  approved_count: number;
  reviewed_count: number;
  rejected_count: number;
  total_volume: string;
  approved_volume: string;
}

export interface BehavioralEventRow {
  id: string;
  vault_address: string;
  proposal_id: string | null;
  event_type: string;
  recipient_address: string | null;
  amount: string | null;
  token_address: string | null;
  token_symbol: string | null;
  risk_score: number | null;
  risk_verdict: string | null;
  risk_reasons: string[] | null;
  triggered_rules: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
