-- Sage backend schema
-- Run against your Supabase project via the SQL editor or psql.

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_details (
  vault_address       TEXT PRIMARY KEY,           -- Squads vault PDA (base58)
  multisig_address    TEXT,                        -- Squads multisig account (base58)
  signer_address      TEXT,                        -- User's Solana wallet (Privy embedded)
  email               TEXT,
  name                TEXT,
  telegram_id         TEXT,
  telegram_chat_id    TEXT,
  bot_connected       BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_details_signer_address ON user_details (signer_address);
CREATE INDEX IF NOT EXISTS user_details_telegram_chat_id ON user_details (telegram_chat_id);

-- ── Multisig proposals ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS multisig_proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  multisig_address TEXT NOT NULL,                 -- Squads multisig account (base58)
  vault_address    TEXT NOT NULL,                 -- Squads vault PDA (base58)
  proposal_index   BIGINT,                        -- Squads transaction index
  to_address       TEXT,                          -- Destination (base58)
  amount           TEXT,                          -- Human-readable (e.g. "1.5")
  token_symbol     TEXT,
  token_address    TEXT,                          -- SPL mint address (base58), null for SOL
  token_icon_url   TEXT,
  proposed_by      TEXT,                          -- Signer who created the proposal
  proposed_at      TIMESTAMPTZ DEFAULT NOW(),
  executed_at      TIMESTAMPTZ,
  tx_signature     TEXT,                          -- Solana transaction signature
  status           TEXT DEFAULT 'pending'         -- pending | active | approved | executed | rejected | cancelled
);

CREATE INDEX IF NOT EXISTS multisig_proposals_vault ON multisig_proposals (vault_address);
CREATE INDEX IF NOT EXISTS multisig_proposals_multisig ON multisig_proposals (multisig_address);
CREATE INDEX IF NOT EXISTS multisig_proposals_tx_sig ON multisig_proposals (tx_signature);

-- ── User settings ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  vault_address     TEXT PRIMARY KEY,
  screening_mode    BOOLEAN NOT NULL DEFAULT FALSE,
  last_check        TIMESTAMPTZ,
  telegram_chat_id  TEXT,
  bot_connected     BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Global limits ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS global_limits (
  vault_address             TEXT PRIMARY KEY,
  max_single_tx             TEXT NOT NULL DEFAULT '5000',
  max_hourly_volume         TEXT NOT NULL DEFAULT '10000',
  max_daily_volume          TEXT NOT NULL DEFAULT '20000',
  max_weekly_volume         TEXT NOT NULL DEFAULT '100000',
  max_daily_tx_count        INT NOT NULL DEFAULT 50,
  allowed_hours_utc         INT[] NOT NULL DEFAULT '{}',
  allowed_days_utc          INT[] NOT NULL DEFAULT '{}',
  unknown_recipient_action  TEXT NOT NULL DEFAULT 'review'
                              CHECK (unknown_recipient_action IN ('approve','review','block')),
  risk_threshold_approve    INT NOT NULL DEFAULT 30,
  risk_threshold_block      INT NOT NULL DEFAULT 70,
  learning_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── User rules ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_address TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  rule_type     TEXT NOT NULL
                  CHECK (rule_type IN ('amount_limit','recipient_block','recipient_whitelist',
                                       'time_restriction','velocity_limit','token_restriction','custom')),
  conditions    JSONB NOT NULL DEFAULT '{}',
  action        TEXT NOT NULL CHECK (action IN ('approve','review','block')),
  risk_score_delta INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  priority      INT NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_rules_vault ON user_rules (vault_address);

-- ── Recipient profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipient_profiles (
  address             TEXT NOT NULL,
  vault_address       TEXT NOT NULL,
  label               TEXT,
  category            TEXT NOT NULL DEFAULT 'unknown',
  trust_level         TEXT NOT NULL DEFAULT 'neutral'
                        CHECK (trust_level IN ('trusted','neutral','suspicious','blocked')),
  total_tx_count      INT NOT NULL DEFAULT 0,
  total_volume        TEXT NOT NULL DEFAULT '0',
  avg_amount          TEXT NOT NULL DEFAULT '0',
  min_amount          TEXT NOT NULL DEFAULT '0',
  max_amount          TEXT NOT NULL DEFAULT '0',
  stddev_amount       TEXT NOT NULL DEFAULT '0',
  typical_hours_utc   INT[],
  typical_days_of_week INT[],
  avg_days_between_txs TEXT,
  first_seen          TIMESTAMPTZ,
  last_seen           TIMESTAMPTZ,
  custom_attributes   JSONB NOT NULL DEFAULT '{}',
  notes               TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (address, vault_address)
);

CREATE INDEX IF NOT EXISTS recipient_profiles_vault ON recipient_profiles (vault_address);

-- ── Time patterns ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_patterns (
  vault_address TEXT NOT NULL,
  hour_utc      INT NOT NULL CHECK (hour_utc BETWEEN 0 AND 23),
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  tx_count      INT NOT NULL DEFAULT 0,
  total_volume  TEXT NOT NULL DEFAULT '0',
  is_allowed    BOOLEAN,
  PRIMARY KEY (vault_address, hour_utc, day_of_week)
);

-- ── Velocity windows ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS velocity_windows (
  vault_address TEXT NOT NULL,
  window_type   TEXT NOT NULL CHECK (window_type IN ('hourly','daily','weekly','monthly')),
  window_start  TIMESTAMPTZ NOT NULL,
  tx_count      INT NOT NULL DEFAULT 0,
  total_volume  TEXT NOT NULL DEFAULT '0',
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (vault_address, window_type)
);

-- ── Token patterns ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS token_patterns (
  vault_address  TEXT NOT NULL,
  token_address  TEXT NOT NULL,
  token_symbol   TEXT,
  total_tx_count INT NOT NULL DEFAULT 0,
  total_volume   TEXT NOT NULL DEFAULT '0',
  avg_amount     TEXT NOT NULL DEFAULT '0',
  max_amount     TEXT NOT NULL DEFAULT '0',
  is_familiar    BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen     TIMESTAMPTZ,
  last_used      TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (vault_address, token_address)
);

-- ── Daily stats ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_stats (
  date            TEXT NOT NULL,   -- YYYY-MM-DD
  vault_address   TEXT NOT NULL,
  tx_count        INT NOT NULL DEFAULT 0,
  approved_count  INT NOT NULL DEFAULT 0,
  reviewed_count  INT NOT NULL DEFAULT 0,
  rejected_count  INT NOT NULL DEFAULT 0,
  total_volume    TEXT NOT NULL DEFAULT '0',
  approved_volume TEXT NOT NULL DEFAULT '0',
  PRIMARY KEY (date, vault_address)
);

-- ── Behavioral events ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS behavioral_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_address     TEXT NOT NULL,
  proposal_id       TEXT,
  event_type        TEXT NOT NULL,
  recipient_address TEXT,
  amount            TEXT,
  token_address     TEXT,
  token_symbol      TEXT,
  risk_score        INT,
  risk_verdict      TEXT,
  risk_reasons      TEXT[],
  triggered_rules   TEXT[],
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS behavioral_events_vault ON behavioral_events (vault_address);
CREATE INDEX IF NOT EXISTS behavioral_events_created ON behavioral_events (vault_address, created_at DESC);

-- ── Proposal risk + lifecycle fields ─────────────────────────────────────────
-- Extend multisig_proposals with risk scoring and review workflow.

ALTER TABLE multisig_proposals
  ADD COLUMN IF NOT EXISTS risk_score       INT,
  ADD COLUMN IF NOT EXISTS risk_verdict     TEXT CHECK (risk_verdict IN ('APPROVE','REVIEW','BLOCK')),
  ADD COLUMN IF NOT EXISTS risk_reasons     TEXT[],
  ADD COLUMN IF NOT EXISTS in_review        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_reason    TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reject_reason    TEXT,
  ADD COLUMN IF NOT EXISTS amount_usd       TEXT,
  ADD COLUMN IF NOT EXISTS screening_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS token_icon_url   TEXT;
