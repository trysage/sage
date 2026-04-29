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
}
