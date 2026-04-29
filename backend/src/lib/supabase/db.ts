import { supabase } from "./client.js";
import type { UserDetailsRow, MultisigProposalRow } from "./types.js";
import type { MultisigProposal, ProposalStatus } from "../../types.js";

// ── User helpers ──────────────────────────────────────────────────────────────

export async function getUserBySignerAddress(
  signerAddress: string
): Promise<UserDetailsRow | null> {
  const { data, error } = await supabase
    .from("user_details")
    .select("*")
    .eq("signer_address", signerAddress)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserByVaultAddress(
  vaultAddress: string
): Promise<UserDetailsRow | null> {
  const { data, error } = await supabase
    .from("user_details")
    .select("*")
    .eq("vault_address", vaultAddress)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertUser(
  vaultAddress: string,
  fields: Partial<Omit<UserDetailsRow, "vault_address" | "created_at" | "updated_at">>
): Promise<UserDetailsRow> {
  const { data, error } = await supabase
    .from("user_details")
    .upsert(
      { vault_address: vaultAddress, ...fields, updated_at: new Date().toISOString() },
      { onConflict: "vault_address" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
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
  };
}

export async function getProposalsByVault(
  vaultAddress: string,
  limit = 50
): Promise<MultisigProposal[]> {
  const { data, error } = await supabase
    .from("multisig_proposals")
    .select("*")
    .eq("vault_address", vaultAddress)
    .order("proposed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToProposal);
}

export async function getProposal(id: string): Promise<MultisigProposal | null> {
  const { data, error } = await supabase
    .from("multisig_proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProposal(data) : null;
}

export async function createProposal(
  fields: Omit<MultisigProposalRow, "id" | "proposed_at">
): Promise<MultisigProposal> {
  const { data, error } = await supabase
    .from("multisig_proposals")
    .insert({ ...fields, proposed_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return rowToProposal(data);
}

export async function updateProposal(
  id: string,
  fields: Partial<Omit<MultisigProposalRow, "id">>
): Promise<void> {
  const { error } = await supabase
    .from("multisig_proposals")
    .update(fields)
    .eq("id", id);
  if (error) throw error;
}
