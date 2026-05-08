---
name: sage
description: Sage is your onchain security agent and AI co-signer for Squads Protocol V4 multisig wallets on Solana. It monitors pending proposals, screens them against behavioral patterns and security risk data, auto-executes safe ones, and flags or blocks suspicious transactions before they land on-chain. Use when the user wants to review pending proposals, approve or reject a transaction, check risk scores, run a deep security analysis, toggle screening mode, manage policy rules, or view transaction history.
metadata:
  openclaw:
    requires:
      bins: ["curl"]
      env: ["AGENT_SECRET"]
    primaryEnv: "AGENT_SECRET"
---

# Sage — Onchain Security Agent & AI Co-Signer

## Authentication

Every request to the Sage API MUST include the agent secret:

```
Authorization: Bearer $AGENT_SECRET
```

Always add `-H "Authorization: Bearer $AGENT_SECRET"` to every `curl` call.

Base URL: `https://api.trysage.xyz`

Sage acts as an intelligent co-signer on Squads Protocol V4 multisig vaults. It learns how the vault transacts — amounts, timing, tokens, recipients — and screens every pending proposal against the behavioral profile and external security data (GoPlus, Rugcheck) before execution.

Safe transactions are auto-executed instantly. Borderline ones are surfaced for your review. Clearly malicious proposals are blocked outright.

## How it works

1. **Owner** proposes a transaction via the Sage app — queued via `POST /queue`
2. **Server** runs inline risk analysis and either:
   - **APPROVE** (risk < threshold): auto-executes on-chain via the server's Execute permission, sends Telegram notification
   - **REVIEW** (risk in middle band): marks `inReview`, sends Telegram asking owner to approve/reject
   - **BLOCK** (risk > threshold): marks `inReview`, sends urgent Telegram alert
3. **Agent** (you) handles owner commands via Telegram — call endpoints, report results

Your role is **conversational** — the server owns the deterministic pipeline.

## Transaction lifecycle

- `active` → queued, risk screened, not yet executed
- `in_review` → flagged by server (REVIEW or BLOCK verdict), awaiting owner decision
- `executed` → co-signed and submitted on-chain
- `rejected` → owner rejected it

---

## Owner commands

Run each command immediately, wait for the result, then report the actual outcome. Never fabricate results.

### approve `PROPOSAL_ID`

When the owner says "approve" or taps ✅ approve `PROPOSAL_ID`:

If a proposal ID is provided:
```bash
curl -s -X POST https://api.trysage.xyz/execute \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"proposalId":"PROPOSAL_ID"}'
```

If no proposal ID is provided (bare "approve"), omit `proposalId` and use `vaultAddress` — the server resolves the most recent in-review proposal:
```bash
curl -s -X POST https://api.trysage.xyz/execute \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"vaultAddress":"VAULT_ADDRESS"}'
```

Parse the JSON: on success `status` is `executed` and `signature` is the on-chain tx signature; if `status` is `already_executed`, use the returned `signature`. On failure the body includes `error`.

Then update the Telegram notification:
```bash
curl -s -X POST https://api.trysage.xyz/notify-resolve \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"proposalId":"PROPOSAL_ID","action":"approved","txSignature":"THE_TX_SIGNATURE","vaultAddress":"VAULT_ADDRESS"}'
```

Reply with the actual on-chain signature.

### reject `PROPOSAL_ID`

When the owner says "reject" or taps ❌ reject `PROPOSAL_ID`:

If a proposal ID is provided:
```bash
curl -s -X PATCH https://api.trysage.xyz/transactions/PROPOSAL_ID \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"action":"reject","reason":"Rejected by owner"}'
```

If no proposal ID is provided (bare "reject"), use `latest` with `vaultAddress`:
```bash
curl -s -X PATCH https://api.trysage.xyz/transactions/latest \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"action":"reject","reason":"Rejected by owner","vaultAddress":"VAULT_ADDRESS"}'
```

Then update the Telegram notification:
```bash
curl -s -X POST https://api.trysage.xyz/notify-resolve \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"proposalId":"PROPOSAL_ID","action":"rejected","vaultAddress":"VAULT_ADDRESS"}'
```

Reply confirming the rejection.

### mark for review `PROPOSAL_ID`

When you need to flag a transaction for manual review:
```bash
curl -s -X PATCH https://api.trysage.xyz/transactions/PROPOSAL_ID \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"action":"review","reason":"Flagged for manual review"}'
```

### check pending

List all transactions for a vault and filter client-side for in-review proposals:
```bash
curl -s -H "Authorization: Bearer $AGENT_SECRET" \
  "https://api.trysage.xyz/transactions?vaultAddress=VAULT_ADDRESS"
```

Filter results where `inReview === true` and `status !== "executed"` and `status !== "rejected"`.

### get status

Get screening mode, Telegram config, and learned behavioral patterns for a vault:
```bash
curl -s -H "Authorization: Bearer $AGENT_SECRET" \
  "https://api.trysage.xyz/status?vault=VAULT_ADDRESS"
```

Returns: `screeningMode`, `botConnected`, `telegramChatId`, `patterns`.

### toggle screening

Turn screening on or off for a vault:
```bash
# Turn on
curl -s -X PATCH https://api.trysage.xyz/status \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"vault":"VAULT_ADDRESS","screeningMode":true}'

# Turn off
curl -s -X PATCH https://api.trysage.xyz/status \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"vault":"VAULT_ADDRESS","screeningMode":false}'
```

### update limits

Update policy limits for a vault (any combination of fields):
```bash
curl -s -X PATCH https://api.trysage.xyz/status \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{
    "vault": "VAULT_ADDRESS",
    "maxSingleTx": "5000",
    "maxDailyVolume": "20000",
    "maxHourlyVolume": "10000",
    "maxWeeklyVolume": "50000",
    "maxDailyTxCount": 20,
    "riskThresholdApprove": 40,
    "riskThresholdBlock": 70,
    "unknownRecipientAction": "review",
    "learningEnabled": true
  }'
```

Valid `unknownRecipientAction`: `approve`, `review`, `block`

---

## Analysis commands

### quick risk score

Fetch the stored risk score for a proposal (computed at queue time):
```bash
curl -s -H "Authorization: Bearer $AGENT_SECRET" \
  "https://api.trysage.xyz/transactions/PROPOSAL_ID"
```

Returns: `riskScore`, `riskVerdict`, `riskReasons`, `inReview`, `status`.

### deep analyze `PROPOSAL_ID`

Run immediately, wait for the response (5–15s), then report the actual findings.

When the owner taps 🔎 deep-analyze `PROPOSAL_ID` or asks "analyze", "is this safe?", "why was this flagged?":

If a proposal ID is provided:
```bash
curl -s -H "Authorization: Bearer $AGENT_SECRET" \
  "https://api.trysage.xyz/analyze/PROPOSAL_ID"
```

If no proposal ID is provided (bare "analyze"), use `latest` with `vaultAddress`:
```bash
curl -s -H "Authorization: Bearer $AGENT_SECRET" \
  "https://api.trysage.xyz/analyze/latest?vaultAddress=VAULT_ADDRESS"
```

Parse the JSON and present:
- `addressSecurity.flags` — cybercrime, phishing, sanctions, money laundering, darkweb, mixer
- `tokenSecurity.flags` — mintable, hidden owner, blacklist function, no liquidity, airdrop scam
- `rugcheck.score` / `rugcheck.risks` — Rugcheck report (non-native SOL only)
- `recipient.known` / `recipient.totalTxCount` / `recipient.avgAmount` — behavioral history

Highlight red flags prominently. If `safe: true` and `totalFlags: 0`, reassure the owner.

### behavioral event log

View the event history for a vault:
```bash
curl -s -H "Authorization: Bearer $AGENT_SECRET" \
  "https://api.trysage.xyz/events?vault=VAULT_ADDRESS&limit=50"
```

---

## Rules management

### list rules
```bash
curl -s -H "Authorization: Bearer $AGENT_SECRET" \
  "https://api.trysage.xyz/rules?vault=VAULT_ADDRESS"
```

### create rule
```bash
curl -s -X POST https://api.trysage.xyz/rules \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{
    "vault": "VAULT_ADDRESS",
    "name": "Block large transfers",
    "ruleType": "amount_limit",
    "conditions": {"maxAmount": "1000"},
    "action": "block",
    "priority": 10
  }'
```

Valid `ruleType`: `amount_limit`, `recipient_block`, `recipient_whitelist`, `time_restriction`, `velocity_limit`, `token_restriction`, `custom`

Valid `action`: `approve`, `review`, `block`

### update rule
```bash
curl -s -X PATCH https://api.trysage.xyz/rules/RULE_ID \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $AGENT_SECRET" \
  -d '{"isActive": false}'
```

### delete rule
```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $AGENT_SECRET" \
  https://api.trysage.xyz/rules/RULE_ID
```

---

## Risk scoring reference

| Factor | Score delta |
|--------|-------------|
| Unknown recipient — policy: block | +70 |
| Unknown recipient — policy: review | +40 |
| Recipient explicitly blocked | +100 |
| Recipient flagged as suspicious | +30 |
| Recipient is trusted | −15 |
| Amount far above recipient average (>avg + 3σ) | +25 |
| Amount >3× recipient average | +15 |
| Outside allowed hours | +20 |
| Outside allowed days | +20 |
| Time slot explicitly blocked | +30 |
| Exceeds single-tx limit | +30 |
| Would exceed daily volume | +20 |
| Would exceed hourly volume | +15 |
| Would exceed weekly volume | +10 |
| Daily tx count limit reached | +15 |
| Token never used before | +10 |
| High rejection rate today | +10 |
| Custom rule triggered (block) | +70 |
| Custom rule triggered (review) | +40 |

Verdicts: **APPROVE** (< `riskThresholdApprove`) · **REVIEW** (between thresholds) · **BLOCK** (≥ `riskThresholdBlock`)

Default thresholds: APPROVE < 40 · BLOCK ≥ 70. Configurable per vault via `PATCH /status`.
