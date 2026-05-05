import type { RiskInput, PatternsFile, RiskResult, UserRule } from "./types.js";

export function analyzeRisk(tx: RiskInput, patterns: PatternsFile): RiskResult {
  let riskScore = 0;
  const reasons: string[] = [];
  const triggeredRules: string[] = [];

  const amount = parseFloat(tx.amountUSD ?? tx.amount);
  const limits = patterns.globalLimits;
  const now = new Date();
  const hourUtc = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  const today = now.toISOString().split("T")[0];

  const recipient = patterns.recipients[tx.to.toLowerCase()];

  // 1. Recipient trust level
  if (!recipient) {
    const action = limits.unknownRecipientAction;
    if (action === "block")        riskScore += 70;
    else if (action === "review")  riskScore += 40;
    reasons.push(`Unknown recipient (first time seen) — policy: ${action}`);
  } else {
    if (recipient.trustLevel === "blocked") {
      riskScore += 100;
      reasons.push("Recipient is explicitly blocked");
    } else if (recipient.trustLevel === "suspicious") {
      riskScore += 30;
      reasons.push("Recipient is flagged as suspicious");
    } else if (recipient.trustLevel === "trusted") {
      riskScore = Math.max(0, riskScore - 15);
      reasons.push("Recipient is trusted");
    }

    const avg    = parseFloat(recipient.avgAmount    || "0");
    const stddev = parseFloat(recipient.stddevAmount || "0");
    if (avg > 0 && amount > avg + stddev * 3) {
      riskScore += 25;
      reasons.push(`Amount ${amount.toFixed(4)} is far above the usual range for this recipient (avg ${avg}, σ ${stddev.toFixed(4)})`);
    } else if (avg > 0 && amount > avg * 3) {
      riskScore += 15;
      reasons.push(`Amount ${amount.toFixed(4)} is ${(amount / avg).toFixed(1)}× the average (${avg})`);
    }

    if (recipient.typicalHoursUtc.length > 0 && !recipient.typicalHoursUtc.includes(hourUtc)) {
      riskScore += 10;
      reasons.push(`Recipient not typically paid at ${hourUtc}:00 UTC (usual: ${recipient.typicalHoursUtc.join(", ")})`);
    }
  }

  // 2. Time-of-day / day-of-week
  const timeKey  = `${hourUtc}:${dayOfWeek}`;
  const timeSlot = patterns.timePatterns[timeKey];

  if (timeSlot?.isAllowed === false) {
    riskScore += 30;
    reasons.push(`Time slot ${hourUtc}:00 UTC on day ${dayOfWeek} is explicitly blocked`);
  } else if (limits.allowedHoursUTC.length > 0 && !limits.allowedHoursUTC.includes(hourUtc)) {
    riskScore += 20;
    reasons.push(`Current time ${hourUtc}:00 UTC is outside allowed business hours`);
  } else if (limits.allowedDaysUTC.length > 0 && !limits.allowedDaysUTC.includes(dayOfWeek)) {
    riskScore += 20;
    reasons.push(`Today (day ${dayOfWeek}) is outside allowed business days`);
  }

  // 3. Single-tx amount limit
  if (amount > parseFloat(limits.maxSingleTx)) {
    riskScore += 30;
    reasons.push(`Amount ${amount.toFixed(4)} exceeds single-tx limit of ${limits.maxSingleTx}`);
  }

  // 4. Velocity: daily volume
  const dailyVolumeUsed = parseFloat(patterns.velocity.daily?.totalVolume ?? "0");
  if (dailyVolumeUsed + amount > parseFloat(limits.maxDailyVolume)) {
    riskScore += 20;
    reasons.push(`Would exceed daily volume limit (${dailyVolumeUsed.toFixed(4)} + ${amount.toFixed(4)} > ${limits.maxDailyVolume})`);
  }

  // 5. Velocity: hourly volume
  const hourlyVolumeUsed = parseFloat(patterns.velocity.hourly?.totalVolume ?? "0");
  if (hourlyVolumeUsed + amount > parseFloat(limits.maxHourlyVolume)) {
    riskScore += 15;
    reasons.push(`Would exceed hourly volume limit (${hourlyVolumeUsed.toFixed(4)} + ${amount.toFixed(4)} > ${limits.maxHourlyVolume})`);
  }

  // 6. Velocity: weekly volume
  const weeklyVolumeUsed = parseFloat(patterns.velocity.weekly?.totalVolume ?? "0");
  if (weeklyVolumeUsed + amount > parseFloat(limits.maxWeeklyVolume)) {
    riskScore += 10;
    reasons.push(`Would exceed weekly volume limit (${weeklyVolumeUsed.toFixed(4)} + ${amount.toFixed(4)} > ${limits.maxWeeklyVolume})`);
  }

  // 7. Daily tx count limit
  const dailyTxCount = patterns.velocity.daily?.txCount ?? 0;
  if (dailyTxCount >= limits.maxDailyTxCount) {
    riskScore += 15;
    reasons.push(`Daily transaction count limit reached (${dailyTxCount} / ${limits.maxDailyTxCount})`);
  }

  // 8. Token familiarity
  const tokenKey = (tx.tokenAddress ?? "").toLowerCase();
  if (tokenKey) {
    const tokenPattern = patterns.tokenPatterns[tokenKey];
    if (!tokenPattern || !tokenPattern.isFamiliar) {
      riskScore += 10;
      reasons.push(`Token ${tx.token || tokenKey} has not been used before`);
    }
  }

  // 9. Daily rejection rate
  const todayStats = patterns.dailyStats[today];
  if (todayStats && todayStats.txCount > 0) {
    const rejectionRate = todayStats.rejectedCount / todayStats.txCount;
    if (rejectionRate > 0.5 && todayStats.txCount >= 3) {
      riskScore += 10;
      reasons.push(`High rejection rate today (${todayStats.rejectedCount}/${todayStats.txCount} rejected)`);
    }
  }

  // 10. Custom user rules
  for (const rule of patterns.rules) {
    if (evaluateRule(rule, tx, { amount, hourUtc, dayOfWeek })) {
      riskScore += rule.riskScoreDelta;
      triggeredRules.push(rule.id);
      reasons.push(`Rule "${rule.name}" triggered`);
    }
  }

  riskScore = Math.max(0, Math.min(riskScore, 100));

  if (reasons.length === 0) {
    reasons.push("Known recipient, normal amount, within allowed hours — no anomalies detected");
  }

  const verdict: RiskResult["verdict"] =
    riskScore < limits.riskThresholdApprove ? "APPROVE"
    : riskScore < limits.riskThresholdBlock  ? "REVIEW"
    : "BLOCK";

  return { riskScore, verdict, reasons, triggeredRules };
}

function evaluateRule(
  rule: UserRule,
  tx: RiskInput,
  ctx: { amount: number; hourUtc: number; dayOfWeek: number }
): boolean {
  const c = rule.conditions;
  switch (rule.ruleType) {
    case "amount_limit": {
      const max = parseFloat((c.max as string) ?? "0");
      const token = (c.token as string | undefined)?.toLowerCase();
      if (token && tx.token?.toLowerCase() !== token) return false;
      return ctx.amount > max;
    }
    case "recipient_block":
      return tx.to.toLowerCase() === (c.address as string)?.toLowerCase();
    case "recipient_whitelist":
      return tx.to.toLowerCase() === (c.address as string)?.toLowerCase();
    case "time_restriction": {
      const hours = (c.hours as number[] | undefined) ?? [];
      const days  = (c.days  as number[] | undefined) ?? [];
      const hourMatch = hours.length === 0 || hours.includes(ctx.hourUtc);
      const dayMatch  = days.length  === 0 || days.includes(ctx.dayOfWeek);
      return hourMatch && dayMatch;
    }
    case "token_restriction": {
      const targetToken = (c.token as string)?.toLowerCase();
      return !!(targetToken && tx.tokenAddress?.toLowerCase() === targetToken);
    }
    case "velocity_limit":
    case "custom":
    default:
      return false;
  }
}
