"use client";

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";

const STORAGE_KEY = "sage_multisig_v1";

interface StoredAccount {
  multisigPda: string;
  vaultPda: string;
}

export interface SageAccountInfo {
  multisigPda: PublicKey;
  vaultPda: PublicKey;
}

// ── internals ────────────────────────────────────────────────────────────────

async function resolveTreasury(connection: Connection): Promise<PublicKey> {
  try {
    const [configPda] = multisig.getProgramConfigPda({});
    const config = await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      configPda
    );
    return config.treasury;
  } catch {
    return SystemProgram.programId;
  }
}

/**
 * Build, sign (with Privy + optional extra keypairs), send, and confirm one
 * Solana transaction. Throws if the transaction fails on-chain.
 */
async function buildAndSend(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet,
  instructions: TransactionInstruction[],
  extraSigners: Keypair[] = []
): Promise<string> {
  const payer = new PublicKey(solanaWallet.address);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);

  if (extraSigners.length > 0) {
    tx.sign(extraSigners);
  }

  const { signedTransaction } = await solanaWallet.signTransaction({
    transaction: tx.serialize(),
  });
  const finalTx = VersionedTransaction.deserialize(signedTransaction);

  const sig = await connection.sendRawTransaction(finalTx.serialize(), {
    skipPreflight: false, // catch on-chain errors early
  });

  const result = await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  if (result.value.err) {
    // Fetch logs for a readable error
    const detail = await connection.getTransaction(sig, {
      maxSupportedTransactionVersion: 0,
    });
    const logs = detail?.meta?.logMessages?.join("\n") ??
      JSON.stringify(result.value.err);
    throw new Error(logs);
  }

  return sig;
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Create a 1-of-1 Squads V4 multisig with the Privy Solana wallet as the sole
 * member. Persists multisigPda + vaultPda to localStorage.
 */
export async function createSageAccount(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet
): Promise<SageAccountInfo> {
  const creator = new PublicKey(solanaWallet.address);
  const treasury = await resolveTreasury(connection);
  const createKey = Keypair.generate();

  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  const ix = multisig.instructions.multisigCreateV2({
    treasury,
    creator,
    multisigPda,
    configAuthority: null,
    threshold: 1,
    members: [
      {
        key: creator,
        permissions: multisig.types.Permissions.all(),
      },
    ],
    timeLock: 0,
    createKey: createKey.publicKey,
    rentCollector: null,
  });

  await buildAndSend(connection, solanaWallet, [ix], [createKey]);

  const stored: StoredAccount = {
    multisigPda: multisigPda.toBase58(),
    vaultPda: vaultPda.toBase58(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  return { multisigPda, vaultPda };
}

/** Load a previously created Sage account from localStorage. */
export function loadSageAccount(): SageAccountInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const stored: StoredAccount = JSON.parse(raw);
    return {
      multisigPda: new PublicKey(stored.multisigPda),
      vaultPda: new PublicKey(stored.vaultPda),
    };
  } catch {
    return null;
  }
}

/** Clear the stored Sage account (call on logout). */
export function clearSageAccount(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

/**
 * Propose a vault transaction and immediately approve it (threshold=1).
 * All three Squads instructions are batched into a single Solana transaction.
 * Requires ~0.005 SOL in the fee-payer wallet to cover account rent.
 *
 * @returns transactionIndex of the new proposal
 */
export async function proposeTransaction(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet,
  multisigPda: PublicKey,
  innerInstructions: TransactionInstruction[],
  memo?: string
): Promise<bigint> {
  const member = new PublicKey(solanaWallet.address);
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  const state = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda
  );
  const transactionIndex =
    multisig.utils.toBigInt(state.transactionIndex) + BigInt(1);

  // Inner message: what the vault will execute when the proposal is approved
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const innerMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: blockhash,
    instructions: innerInstructions,
  });

  await buildAndSend(connection, solanaWallet, [
    multisig.instructions.vaultTransactionCreate({
      multisigPda,
      transactionIndex,
      creator: member,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: innerMessage,
      memo,
    }),
    multisig.instructions.proposalCreate({
      multisigPda,
      creator: member,
      transactionIndex,
    }),
    // threshold=1 → immediately moves status to Approved
    multisig.instructions.proposalApprove({
      multisigPda,
      transactionIndex,
      member,
    }),
  ]);

  return transactionIndex;
}

/**
 * Execute an approved vault transaction.
 * Call after `proposeTransaction` (which auto-approves for a 1-of-1 multisig).
 */
export async function executeTransaction(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet,
  multisigPda: PublicKey,
  transactionIndex: bigint
): Promise<string> {
  const member = new PublicKey(solanaWallet.address);

  const { instruction, lookupTableAccounts } =
    await multisig.instructions.vaultTransactionExecute({
      connection,
      multisigPda,
      transactionIndex,
      member,
    });

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: member,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message(lookupTableAccounts);

  const tx = new VersionedTransaction(message);
  const { signedTransaction } = await solanaWallet.signTransaction({
    transaction: tx.serialize(),
  });
  const finalTx = VersionedTransaction.deserialize(signedTransaction);

  const sig = await connection.sendRawTransaction(finalTx.serialize(), {
    skipPreflight: false,
  });

  const result = await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  if (result.value.err) {
    const detail = await connection.getTransaction(sig, {
      maxSupportedTransactionVersion: 0,
    });
    const logs = detail?.meta?.logMessages?.join("\n") ??
      JSON.stringify(result.value.err);
    throw new Error(logs);
  }

  return sig;
}

/**
 * Propose + execute in sequence for a 1-of-1 multisig.
 * Triggers 2 Privy signing prompts (1 for propose, 1 for execute).
 * Returns the execute transaction signature.
 */
export async function proposeAndExecute(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet,
  multisigPda: PublicKey,
  innerInstructions: TransactionInstruction[],
  memo?: string
): Promise<string> {
  const txIndex = await proposeTransaction(
    connection,
    solanaWallet,
    multisigPda,
    innerInstructions,
    memo
  );
  return executeTransaction(connection, solanaWallet, multisigPda, txIndex);
}
