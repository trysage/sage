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
