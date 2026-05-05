import { supabase } from "./client.js";
import type {
  UserDetailsRow,
  MultisigProposalRow,
  UserSettingsRow,
  GlobalLimitsRow,
  UserRuleRow,
  RecipientProfileRow,
  TimePatternRow,
  VelocityWindowRow,
  TokenPatternRow,
  DailyStatsRow,
  BehavioralEventRow,
} from "./types.js";
import type { MultisigProposal, ProposalStatus, PatternsFile } from "../../types.js";

// ── User helpers ──────────────────────────────────────────────────────────────

export async function getUserBySignerAddress(signerAddress: string): Promise<UserDetailsRow | null> {
  const { data, error } = await supabase
    .from("user_details").select("*").eq("signer_address", signerAddress).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserByVaultAddress(vaultAddress: string): Promise<UserDetailsRow | null> {
  const { data, error } = await supabase
    .from("user_details").select("*").eq("vault_address", vaultAddress).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserByUsername(username: string): Promise<UserDetailsRow | null> {
  const { data } = await supabase
    .from("user_details").select("*").eq("username", username.toLowerCase()).maybeSingle();
  return data ?? null;
}

export async function getUserByTelegramId(chatId: string): Promise<UserDetailsRow | null> {
  const { data } = await supabase
    .from("user_details").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  return data ?? null;
}

export async function upsertUser(
  vaultAddress: string,
  fields: Partial<Omit<UserDetailsRow, "vault_address" | "created_at" | "updated_at">>
): Promise<UserDetailsRow> {
  const { data, error } = await supabase
    .from("user_details")
    .upsert({ vault_address: vaultAddress, ...fields, updated_at: new Date().toISOString() },
             { onConflict: "vault_address" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function markBotConnectedByChatId(chatId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_details")
    .update({ bot_connected: true })
    .eq("telegram_chat_id", chatId)
    .select("vault_address");
  if (error) throw error;

  // Mirror into user_settings so GET /status returns the correct value
  const vaults = (data ?? []).map((r: { vault_address: string }) => r.vault_address).filter(Boolean);
  await Promise.all(
    vaults.map((vault) =>
      supabase
        .from("user_settings")
        .upsert({ vault_address: vault, bot_connected: true, updated_at: new Date().toISOString() },
                 { onConflict: "vault_address" })
    )
  );

  return vaults.length > 0;
}

// ── Proposal helpers ──────────────────────────────────────────────────────────

function rowToProposal(row: MultisigProposalRow): MultisigProposal {
  return {
    id: row.id,
    multisigAddress: row.multisig_address,
    vaultAddress: row.vault_address,
    proposalIndex: row.proposal_index,
    to: row.to_address,
    amount: row.amount,
    tokenSymbol: row.token_symbol,
    tokenAddress: row.token_address,
    tokenIconUrl: row.token_icon_url,
    proposedBy: row.proposed_by,
    proposedAt: row.proposed_at,
    executedAt: row.executed_at,
    txSignature: row.tx_signature,
    status: row.status as ProposalStatus,
    riskScore: row.risk_score,
    riskVerdict: row.risk_verdict,
    riskReasons: row.risk_reasons,
    inReview: row.in_review,
    reviewReason: row.review_reason,
    reviewedAt: row.reviewed_at,
    rejected: row.rejected,
    rejectedAt: row.rejected_at,
    rejectReason: row.reject_reason,
    amountUSD: row.amount_usd,
    screeningDisabled: row.screening_disabled,
  };
}

export async function getProposalsByVault(vaultAddress: string, limit = 50): Promise<MultisigProposal[]> {
  const { data, error } = await supabase
    .from("multisig_proposals")
    .select("*")
    .eq("vault_address", vaultAddress)
    .order("proposed_at", { ascending: false })
    .limit(limit)
    .returns<MultisigProposalRow[]>();
  if (error) throw error;
  return (data ?? []).map(rowToProposal);
}

export async function getProposal(id: string): Promise<MultisigProposal | null> {
  const { data, error } = await supabase
    .from("multisig_proposals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToProposal(data as MultisigProposalRow) : null;
}

export async function getLastInReviewProposal(vaultAddress: string): Promise<MultisigProposal | null> {
  const { data, error } = await supabase
    .from("multisig_proposals")
    .select("*")
    .eq("vault_address", vaultAddress)
    .eq("in_review", true)
    .order("proposed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProposal(data as MultisigProposalRow) : null;
}

export async function createProposal(
  fields: Omit<MultisigProposalRow, "id" | "proposed_at">
): Promise<MultisigProposal> {
  const { data, error } = await supabase
    .from("multisig_proposals")
    .insert({ ...fields, proposed_at: new Date().toISOString() })
    .select().single();
  if (error) throw error;
  return rowToProposal(data as MultisigProposalRow);
}

export async function updateProposal(
  id: string,
  fields: Partial<Omit<MultisigProposalRow, "id">>
): Promise<void> {
  const { error } = await supabase
    .from("multisig_proposals").update(fields).eq("id", id);
  if (error) throw error;
}

// ── User settings ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Omit<UserSettingsRow, "vault_address" | "updated_at"> = {
  screening_mode: false,
  last_check: null,
  telegram_chat_id: null,
  bot_connected: false,
};

export async function getUserSettings(vaultAddress: string): Promise<UserSettingsRow> {
  const { data, error } = await supabase
    .from("user_settings").select("*").eq("vault_address", vaultAddress).maybeSingle();
  if (error) throw error;
  if (!data) return { vault_address: vaultAddress, updated_at: new Date().toISOString(), ...DEFAULT_SETTINGS };
  return data as UserSettingsRow;
}

export async function upsertUserSettings(
  vaultAddress: string,
  patch: Partial<Omit<UserSettingsRow, "vault_address" | "updated_at">>
): Promise<UserSettingsRow> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ vault_address: vaultAddress, ...patch, updated_at: new Date().toISOString() },
             { onConflict: "vault_address" })
    .select().single();
  if (error) throw error;
  return data as UserSettingsRow;
}

export async function getTelegramChatId(vaultAddress: string): Promise<string | undefined> {
  const s = await getUserSettings(vaultAddress);
  return s.telegram_chat_id ?? undefined;
}

// ── Global limits ─────────────────────────────────────────────────────────────

const DEFAULT_LIMITS: Omit<GlobalLimitsRow, "vault_address" | "updated_at"> = {
  max_single_tx: "5000",
  max_hourly_volume: "10000",
  max_daily_volume: "20000",
  max_weekly_volume: "100000",
  max_daily_tx_count: 50,
  allowed_hours_utc: [],
  allowed_days_utc: [],
  unknown_recipient_action: "review",
  risk_threshold_approve: 30,
  risk_threshold_block: 70,
  learning_enabled: true,
};

export async function getGlobalLimits(vaultAddress: string): Promise<GlobalLimitsRow> {
  const { data, error } = await supabase
    .from("global_limits").select("*").eq("vault_address", vaultAddress).maybeSingle();
  if (error) throw error;
  if (!data) return { vault_address: vaultAddress, updated_at: new Date().toISOString(), ...DEFAULT_LIMITS };
  return data as GlobalLimitsRow;
}

export async function upsertGlobalLimits(
  vaultAddress: string,
  patch: Partial<Omit<GlobalLimitsRow, "vault_address" | "updated_at">>
): Promise<GlobalLimitsRow> {
  const { data, error } = await supabase
    .from("global_limits")
    .upsert({ vault_address: vaultAddress, ...patch, updated_at: new Date().toISOString() },
             { onConflict: "vault_address" })
    .select().single();
  if (error) throw error;
  return data as GlobalLimitsRow;
}

// ── User rules ────────────────────────────────────────────────────────────────

export async function getUserRules(vaultAddress: string): Promise<UserRuleRow[]> {
  const { data, error } = await supabase
    .from("user_rules").select("*")
    .eq("vault_address", vaultAddress).eq("is_active", true)
    .order("priority", { ascending: true })
    .returns<UserRuleRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function createUserRule(
  vaultAddress: string,
  rule: Omit<UserRuleRow, "id" | "vault_address" | "created_at" | "updated_at">
): Promise<UserRuleRow> {
  const { data, error } = await supabase
    .from("user_rules")
    .insert({ vault_address: vaultAddress, ...rule })
    .select().single();
  if (error) throw error;
  return data as UserRuleRow;
}

export async function updateUserRule(
  id: string,
  patch: Partial<Omit<UserRuleRow, "id" | "vault_address" | "created_at" | "updated_at">>
): Promise<void> {
  const { error } = await supabase
    .from("user_rules").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteUserRule(id: string): Promise<void> {
  const { error } = await supabase
    .from("user_rules").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// ── Recipient profiles ────────────────────────────────────────────────────────

export async function getRecipientProfile(
  address: string, vaultAddress: string
): Promise<RecipientProfileRow | null> {
  const { data } = await supabase
    .from("recipient_profiles").select("*")
    .eq("address", address.toLowerCase()).eq("vault_address", vaultAddress.toLowerCase())
    .maybeSingle();
  return data ?? null;
}

export async function getRecipientProfiles(vaultAddress: string): Promise<RecipientProfileRow[]> {
  const { data, error } = await supabase
    .from("recipient_profiles").select("*").eq("vault_address", vaultAddress.toLowerCase());
  if (error) throw error;
  return (data ?? []) as RecipientProfileRow[];
}

async function upsertRecipientProfile(
  vault: string, address: string,
  patch: Partial<Omit<RecipientProfileRow, "address" | "vault_address" | "updated_at">>
): Promise<void> {
  const { error } = await supabase
    .from("recipient_profiles")
    .upsert({ address, vault_address: vault, ...patch, updated_at: new Date().toISOString() },
             { onConflict: "address,vault_address" });
  if (error) throw error;
}

// ── Time patterns ─────────────────────────────────────────────────────────────

export async function getTimePatterns(vaultAddress: string): Promise<TimePatternRow[]> {
  const { data, error } = await supabase
    .from("time_patterns").select("*").eq("vault_address", vaultAddress.toLowerCase());
  if (error) throw error;
  return (data ?? []) as TimePatternRow[];
}

async function upsertTimePattern(
  vault: string, hourUtc: number, dayOfWeek: number, amountDelta: number
): Promise<void> {
  const existing = await supabase
    .from("time_patterns").select("*")
    .eq("vault_address", vault).eq("hour_utc", hourUtc).eq("day_of_week", dayOfWeek)
    .maybeSingle();
  const cur = existing.data as TimePatternRow | null;
  const newCount = (cur?.tx_count ?? 0) + 1;
  const newVolume = (parseFloat(cur?.total_volume ?? "0") + amountDelta).toFixed(6);
  await supabase.from("time_patterns").upsert(
    { vault_address: vault, hour_utc: hourUtc, day_of_week: dayOfWeek,
      tx_count: newCount, total_volume: newVolume },
    { onConflict: "vault_address,hour_utc,day_of_week" }
  );
}

// ── Velocity windows ──────────────────────────────────────────────────────────

export async function getCurrentVelocity(
  vaultAddress: string,
  windowType: "hourly" | "daily" | "weekly" | "monthly"
): Promise<{ txCount: number; totalVolume: string } | null> {
  const now = new Date();
  const windowStart = getWindowStart(now, windowType);

  const { data } = await supabase
    .from("velocity_windows").select("*")
    .eq("vault_address", vaultAddress.toLowerCase())
    .eq("window_type", windowType)
    .maybeSingle();

  if (!data) return null;
  const row = data as VelocityWindowRow;
  if (new Date(row.window_start) < windowStart) return null;
  return { txCount: row.tx_count, totalVolume: row.total_volume };
}

export async function incrementVelocityWindow(
  vaultAddress: string,
  windowType: "hourly" | "daily" | "weekly" | "monthly",
  amount: number
): Promise<void> {
  const vault = vaultAddress.toLowerCase();
  const now = new Date();
  const windowStart = getWindowStart(now, windowType).toISOString();

  const { data } = await supabase
    .from("velocity_windows").select("*")
    .eq("vault_address", vault).eq("window_type", windowType).maybeSingle();

  const row = data as VelocityWindowRow | null;
  const isCurrent = row && new Date(row.window_start) >= new Date(windowStart);

  await supabase.from("velocity_windows").upsert(
    {
      vault_address: vault,
      window_type: windowType,
      window_start: windowStart,
      tx_count: isCurrent ? row.tx_count + 1 : 1,
      total_volume: isCurrent
        ? (parseFloat(row.total_volume) + amount).toFixed(6)
        : amount.toFixed(6),
      updated_at: now.toISOString(),
    },
    { onConflict: "vault_address,window_type" }
  );
}

function getWindowStart(now: Date, windowType: string): Date {
  const d = new Date(now);
  switch (windowType) {
    case "hourly":
      d.setUTCMinutes(0, 0, 0);
      return d;
    case "daily":
      d.setUTCHours(0, 0, 0, 0);
      return d;
    case "weekly": {
      const day = d.getUTCDay();
      d.setUTCDate(d.getUTCDate() - day);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    case "monthly":
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    default:
      return d;
  }
}

// ── Token patterns ────────────────────────────────────────────────────────────

export async function getTokenPatterns(vaultAddress: string): Promise<TokenPatternRow[]> {
  const { data, error } = await supabase
    .from("token_patterns").select("*").eq("vault_address", vaultAddress.toLowerCase());
  if (error) throw error;
  return (data ?? []) as TokenPatternRow[];
}

async function upsertTokenPattern(vault: string, tokenAddress: string, tokenSymbol: string | null, amount: number): Promise<void> {
  const addr = tokenAddress.toLowerCase();
  const { data } = await supabase
    .from("token_patterns").select("*")
    .eq("vault_address", vault).eq("token_address", addr).maybeSingle();
  const cur = data as TokenPatternRow | null;
  const newCount = (cur?.total_tx_count ?? 0) + 1;
  const newVolume = (parseFloat(cur?.total_volume ?? "0") + amount).toFixed(6);
  const newAvg = (parseFloat(newVolume) / newCount).toFixed(6);
  const newMax = Math.max(parseFloat(cur?.max_amount ?? "0"), amount).toFixed(6);
  await supabase.from("token_patterns").upsert(
    {
      vault_address: vault, token_address: addr,
      token_symbol: tokenSymbol ?? cur?.token_symbol ?? null,
      total_tx_count: newCount, total_volume: newVolume,
      avg_amount: newAvg, max_amount: newMax,
      is_familiar: true,
      first_seen: cur?.first_seen ?? new Date().toISOString(),
      last_used: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vault_address,token_address" }
  );
}

// ── Daily stats ───────────────────────────────────────────────────────────────

async function incrementDailyStats(
  vault: string, today: string,
  patch: Partial<Record<"tx_count" | "approved_count" | "reviewed_count" | "rejected_count", number>> & { volume?: number; approvedVolume?: number }
): Promise<void> {
  const { data } = await supabase
    .from("daily_stats").select("*").eq("vault_address", vault).eq("date", today).maybeSingle();
  const cur = data as DailyStatsRow | null;

  await supabase.from("daily_stats").upsert(
    {
      date: today, vault_address: vault,
      tx_count:        (cur?.tx_count        ?? 0) + (patch.tx_count        ?? 0),
      approved_count:  (cur?.approved_count  ?? 0) + (patch.approved_count  ?? 0),
      reviewed_count:  (cur?.reviewed_count  ?? 0) + (patch.reviewed_count  ?? 0),
      rejected_count:  (cur?.rejected_count  ?? 0) + (patch.rejected_count  ?? 0),
      total_volume:    (parseFloat(cur?.total_volume    ?? "0") + (patch.volume         ?? 0)).toFixed(6),
      approved_volume: (parseFloat(cur?.approved_volume ?? "0") + (patch.approvedVolume ?? 0)).toFixed(6),
    },
    { onConflict: "date,vault_address" }
  );
}

export async function incrementDailyStatsReview(vaultAddress: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  await incrementDailyStats(vaultAddress.toLowerCase(), today, { reviewed_count: 1 });
}

export async function getDailyStats(vaultAddress: string, days = 30): Promise<DailyStatsRow[]> {
  const { data, error } = await supabase
    .from("daily_stats").select("*")
    .eq("vault_address", vaultAddress.toLowerCase())
    .order("date", { ascending: false }).limit(days)
    .returns<DailyStatsRow[]>();
  if (error) throw error;
  return data ?? [];
}

// ── Behavioral events ─────────────────────────────────────────────────────────

export async function getBehavioralEvents(vaultAddress: string, limit = 100): Promise<BehavioralEventRow[]> {
  const { data, error } = await supabase
    .from("behavioral_events").select("*")
    .eq("vault_address", vaultAddress.toLowerCase())
    .order("created_at", { ascending: false }).limit(limit)
    .returns<BehavioralEventRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function recordBehavioralEvent(
  event: Omit<BehavioralEventRow, "id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("behavioral_events").insert(event);
  if (error) throw error;
}

export async function recordProposalOutcome(
  proposal: MultisigProposal,
  outcome: string,
  opts?: { riskScore?: number; riskVerdict?: string; riskReasons?: string[]; triggeredRules?: string[] }
): Promise<void> {
  await recordBehavioralEvent({
    vault_address: proposal.vaultAddress.toLowerCase(),
    proposal_id: proposal.id,
    event_type: outcome,
    recipient_address: proposal.to?.toLowerCase() ?? null,
    amount: proposal.amountUSD ?? proposal.amount,
    token_address: proposal.tokenAddress?.toLowerCase() ?? null,
    token_symbol: proposal.tokenSymbol,
    risk_score: opts?.riskScore ?? proposal.riskScore ?? null,
    risk_verdict: opts?.riskVerdict ?? proposal.riskVerdict ?? null,
    risk_reasons: opts?.riskReasons ?? proposal.riskReasons ?? null,
    triggered_rules: opts?.triggeredRules ?? null,
    metadata: {},
  });
}

// ── getPatternsForSafe ────────────────────────────────────────────────────────

export async function getPatternsForSafe(vaultAddress: string): Promise<PatternsFile> {
  const vault = vaultAddress.toLowerCase();

  const [
    recipientsData, timeData,
    velocityHourly, velocityDaily, velocityWeekly,
    tokenData, rulesData, dailyStatsData, limits,
  ] = await Promise.all([
    getRecipientProfiles(vault),
    getTimePatterns(vault),
    getCurrentVelocity(vault, "hourly"),
    getCurrentVelocity(vault, "daily"),
    getCurrentVelocity(vault, "weekly"),
    getTokenPatterns(vault),
    getUserRules(vault),
    getDailyStats(vault, 30),
    getGlobalLimits(vault),
  ]);

  const recipients: PatternsFile["recipients"] = {};
  for (const r of recipientsData) {
    recipients[r.address] = {
      label: r.label,
      totalTxCount: r.total_tx_count,
      totalVolume: r.total_volume,
      avgAmount: r.avg_amount,
      minAmount: r.min_amount,
      maxAmount: r.max_amount,
      stddevAmount: r.stddev_amount,
      typicalHoursUtc: r.typical_hours_utc ?? [],
      typicalDaysOfWeek: r.typical_days_of_week ?? [],
      avgDaysBetweenTxs: r.avg_days_between_txs ? parseFloat(r.avg_days_between_txs) : null,
      category: r.category,
      trustLevel: r.trust_level,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      customAttributes: r.custom_attributes,
    };
  }

  const dailyStats: PatternsFile["dailyStats"] = {};
  for (const d of dailyStatsData) {
    dailyStats[d.date] = {
      txCount: d.tx_count, approvedCount: d.approved_count,
      reviewedCount: d.reviewed_count, rejectedCount: d.rejected_count,
      totalVolume: d.total_volume, approvedVolume: d.approved_volume,
    };
  }

  const timePatterns: PatternsFile["timePatterns"] = {};
  for (const t of timeData) {
    timePatterns[`${t.hour_utc}:${t.day_of_week}`] = {
      hourUtc: t.hour_utc, dayOfWeek: t.day_of_week,
      txCount: t.tx_count, totalVolume: t.total_volume, isAllowed: t.is_allowed,
    };
  }

  const tokenPatterns: PatternsFile["tokenPatterns"] = {};
  for (const t of tokenData) {
    tokenPatterns[t.token_address] = {
      symbol: t.token_symbol, totalTxCount: t.total_tx_count,
      totalVolume: t.total_volume, avgAmount: t.avg_amount,
      maxAmount: t.max_amount, isFamiliar: t.is_familiar,
      firstSeen: t.first_seen, lastUsed: t.last_used,
    };
  }

  return {
    recipients,
    dailyStats,
    timePatterns,
    tokenPatterns,
    rules: rulesData.map((r) => ({
      id: r.id, name: r.name, ruleType: r.rule_type,
      conditions: r.conditions, action: r.action,
      riskScoreDelta: r.risk_score_delta, priority: r.priority,
    })),
    velocity: {
      hourly: velocityHourly,
      daily: velocityDaily,
      weekly: velocityWeekly,
    },
    globalLimits: {
      maxSingleTx: limits.max_single_tx,
      maxHourlyVolume: limits.max_hourly_volume,
      maxDailyVolume: limits.max_daily_volume,
      maxWeeklyVolume: limits.max_weekly_volume,
      maxDailyTxCount: limits.max_daily_tx_count,
      allowedHoursUTC: limits.allowed_hours_utc,
      allowedDaysUTC: limits.allowed_days_utc,
      unknownRecipientAction: limits.unknown_recipient_action,
      riskThresholdApprove: limits.risk_threshold_approve,
      riskThresholdBlock: limits.risk_threshold_block,
      learningEnabled: limits.learning_enabled,
    },
  };
}

// ── Pattern learning after execution ─────────────────────────────────────────

export async function updatePatternsAfterExecution(proposal: MultisigProposal): Promise<void> {
  const vault = proposal.vaultAddress.toLowerCase();
  const amount = parseFloat(proposal.amountUSD ?? proposal.amount ?? "0");
  const now = new Date();
  const hourUtc = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  const today = now.toISOString().split("T")[0];
  const recipientAddr = proposal.to?.toLowerCase() ?? "";

  await Promise.all([
    _updateRecipientProfile(vault, recipientAddr, amount, hourUtc, dayOfWeek, now),
    upsertTimePattern(vault, hourUtc, dayOfWeek, amount),
    proposal.tokenAddress
      ? upsertTokenPattern(vault, proposal.tokenAddress, proposal.tokenSymbol ?? null, amount)
      : Promise.resolve(),
    incrementVelocityWindow(vault, "hourly", amount),
    incrementVelocityWindow(vault, "daily", amount),
    incrementVelocityWindow(vault, "weekly", amount),
    incrementVelocityWindow(vault, "monthly", amount),
    incrementDailyStats(vault, today, {
      tx_count: 1, approved_count: 1,
      volume: amount, approvedVolume: amount,
    }),
  ]);
}

async function _updateRecipientProfile(
  vault: string, address: string, amount: number,
  hourUtc: number, dayOfWeek: number, now: Date
): Promise<void> {
  if (!address) return;
  const existing = await getRecipientProfile(address, vault);
  const n = (existing?.total_tx_count ?? 0) + 1;
  const prevVolume = parseFloat(existing?.total_volume ?? "0");
  const newVolume = prevVolume + amount;
  const newAvg = newVolume / n;
  const newMin = Math.min(parseFloat(existing?.min_amount ?? String(amount)), amount);
  const newMax = Math.max(parseFloat(existing?.max_amount ?? "0"), amount);
  const hours = existing?.typical_hours_utc ?? [];
  const days = existing?.typical_days_of_week ?? [];
  if (!hours.includes(hourUtc)) hours.push(hourUtc);
  if (!days.includes(dayOfWeek)) days.push(dayOfWeek);

  await upsertRecipientProfile(vault, address, {
    total_tx_count: n,
    total_volume: newVolume.toFixed(6),
    avg_amount: newAvg.toFixed(6),
    min_amount: newMin.toFixed(6),
    max_amount: newMax.toFixed(6),
    stddev_amount: "0",
    typical_hours_utc: hours,
    typical_days_of_week: days,
    first_seen: existing?.first_seen ?? now.toISOString(),
    last_seen: now.toISOString(),
  });
}
