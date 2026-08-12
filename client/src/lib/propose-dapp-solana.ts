"use client";

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  MessageV0,
  SystemProgram,
  LAMPORTS_PER_SOL,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { proposeTransactionSponsored } from "@/lib/squads";
import { postQueue, getTransactions, executeProposal } from "@/lib/api";
import type { QueueResponse } from "@/lib/api";

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

/** Decompile a serialized VersionedTransaction into legacy-style instructions.
 *  Fetches address lookup tables from the RPC so V0 transactions with LUTs are
 *  fully resolved — every account key will be a concrete PublicKey. */
async function decompileInstructions(
  connection: Connection,
  txBytes: Uint8Array
): Promise<{ instructions: TransactionInstruction[]; addressLookupTableAccounts: AddressLookupTableAccount[] }> {
  const tx = VersionedTransaction.deserialize(txBytes);
  const { message } = tx;

  let addressLookupTableAccounts: AddressLookupTableAccount[] = [];
  if (message instanceof MessageV0 && message.addressTableLookups.length > 0) {
    addressLookupTableAccounts = await Promise.all(
      message.addressTableLookups.map(async (lookup) => {
        const resp = await connection.getAddressLookupTable(lookup.accountKey);
        if (!resp.value) throw new Error(`Address lookup table not found: ${lookup.accountKey.toBase58()}`);
        return resp.value;
      })
    );
  }

  const accountKeys = message instanceof MessageV0
    ? message.getAccountKeys({ addressLookupTableAccounts })
    : message.getAccountKeys();

  const instructions: TransactionInstruction[] = message.compiledInstructions.map((compiled) => {
    const programId = accountKeys.get(compiled.programIdIndex);
    if (!programId) throw new Error(`Cannot resolve programId at index ${compiled.programIdIndex}`);
    return {
      programId,
      keys: compiled.accountKeyIndexes.map((idx) => {
        const pubkey = accountKeys.get(idx);
        if (!pubkey) throw new Error(`Cannot resolve account at index ${idx}`);
        return { pubkey, isSigner: message.isAccountSigner(idx), isWritable: message.isAccountWritable(idx) };
      }),
      data: Buffer.from(compiled.data),
    };
  });

  return { instructions, addressLookupTableAccounts };
}

/** Detect a SOL SystemProgram.Transfer and return its destination/amount.
 *  Falls back to the first writable non-vault account. */
function extractTransferInfo(
  instructions: TransactionInstruction[],
  vaultPda: string
): { to: string; amount: string; tokenSymbol: string } {
  for (const ix of instructions) {
    if (!ix.programId.equals(SystemProgram.programId)) continue;
    if (ix.data.length < 12) continue;
    const instructionType = ix.data.readUInt32LE(0);
    if (instructionType !== 2) continue; // 2 = Transfer
    const lamports = ix.data.readBigUInt64LE(4);
    const from = ix.keys[0]?.pubkey.toBase58();
    const to = ix.keys[1]?.pubkey.toBase58();
    if (from === vaultPda && to) {
      return {
        to,
        amount: (Number(lamports) / LAMPORTS_PER_SOL).toFixed(9),
        tokenSymbol: "SOL",
      };
    }
  }

  // Fallback: first writable account that isn't the vault itself
  for (const ix of instructions) {
    const dest = ix.keys.find(
      (k) => k.isWritable && k.pubkey.toBase58() !== vaultPda
    );
    if (dest) return { to: dest.pubkey.toBase58(), amount: "0", tokenSymbol: "SOL" };
  }

  return { to: "unknown", amount: "0", tokenSymbol: "SOL" };
}

export interface DappProposalResult {
  proposalId: string;
  transactionIndex: bigint;
  autoApproved: boolean;
  signature?: string;
  queueResponse: QueueResponse;
}

export interface ProposeDappSolanaParams {
  serializedTx: Uint8Array;
  solanaWallet: ConnectedStandardSolanaWallet;
  multisigPda: PublicKey;
  vaultPda: string;
  identityToken?: string | null;
  screeningDisabled?: boolean;
}

/** Intercept a dApp-originated Solana transaction, wrap it as a Squads vault
 *  transaction proposal, and queue it for risk screening. */
export async function proposeDappTransactionSolana({
  serializedTx,
  solanaWallet,
  multisigPda,
  vaultPda,
  identityToken,
  screeningDisabled,
}: ProposeDappSolanaParams): Promise<DappProposalResult> {
  const connection = new Connection(RPC_URL, "confirmed");

  const { instructions, addressLookupTableAccounts } = await decompileInstructions(connection, serializedTx);
  if (instructions.length === 0) throw new Error("Transaction has no instructions");

  let transactionIndex: bigint;
  try {
    transactionIndex = await proposeTransactionSponsored(
      connection,
      solanaWallet,
      multisigPda,
      instructions,
      addressLookupTableAccounts,
      "walletconnect",
      identityToken ?? undefined
    );
  } catch (err) {
    throw translateSolanaError(err);
  }

  const { to, amount, tokenSymbol } = extractTransferInfo(instructions, vaultPda);

  const queueResponse = await postQueue(
    {
      multisigAddress: multisigPda.toBase58(),
      vaultAddress: vaultPda,
      proposalIndex: Number(transactionIndex),
      to,
      amount,
      tokenSymbol,
      proposedBy: solanaWallet.address,
      screeningDisabled,
    },
    identityToken ?? undefined
  );

  let signature = queueResponse.signature;

  if (screeningDisabled) {
    try {
      const execResult = await executeProposal(queueResponse.id, identityToken ?? undefined);
      signature = execResult.signature;
    } catch (err) {
      throw translateSolanaError(err);
    }
  }

  return {
    proposalId: queueResponse.id,
    transactionIndex,
    autoApproved: queueResponse.autoApproved ?? false,
    signature,
    queueResponse,
  };
}

function translateSolanaError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Access violation in heap section")) {
    return new Error(
      "Transaction too complex: this swap uses too many accounts to wrap in a Squads vault. Try a simpler swap or use a token with fewer routing hops."
    );
  }
  if (msg.includes("TooManyAccountLocks") || msg.includes("locked too many accounts")) {
    return new Error(
      "Transaction locks too many accounts: this swap exceeds the Solana limit of 64 account locks per transaction."
    );
  }
  if (msg.includes("Computational budget exceeded")) {
    return new Error(
      "Transaction requires too many compute units: this swap is too complex to execute via the vault. Try a simpler route with fewer hops."
    );
  }
  if (msg.includes("too large") || msg.includes("VersionedTransaction too large")) {
    return new Error(
      "Transaction too large: this swap route has too many instructions to wrap in a vault. Try a simpler route with fewer hops."
    );
  }
  if (msg.includes("insufficient funds for rent")) {
    return new Error(
      "Sponsor wallet is low on SOL and cannot cover the vault account rent for this transaction. Please contact support."
    );
  }
  if (msg.includes("custom program error: 0x9")) {
    return new Error(
      "Swap price moved beyond slippage tolerance by the time the vault executed it. Please re-initiate the swap in the dApp — try increasing the slippage tolerance or swapping immediately after approving."
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

/** Poll the transactions endpoint until execution completes or timeout (~3 min). */
export async function pollForSignature(
  proposalId: string,
  vaultPda: string,
  identityToken: string | null,
  maxAttempts = 60,
  intervalMs = 3000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise<void>((r) => setTimeout(r, intervalMs));
    try {
      const data = await getTransactions(vaultPda, identityToken ?? undefined);
      const tx = data.transactions.find((t) => t.id === proposalId);
      if (tx?.txSignature) return tx.txSignature;
      if (tx?.status === "rejected") throw new Error("Transaction rejected by agent");
    } catch (err) {
      if (err instanceof Error && err.message.includes("rejected")) throw err;
    }
  }
  throw new Error("Transaction execution timed out after 3 minutes");
}
