"use client";

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import type { ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";

const storageKey = (walletAddress: string) => `sage_multisig_v1_${walletAddress}`;

function sponsorPubkey(): PublicKey {
  const key = process.env.NEXT_PUBLIC_SPONSOR_PUBKEY;
  if (!key) throw new Error("NEXT_PUBLIC_SPONSOR_PUBKEY not configured");
  return new PublicKey(key);
}

/**
 * Build a transaction with the sponsor server as fee payer, have the Privy
 * wallet add the user's signature, then POST to /api/sponsor/send for the
 * server co-signature and broadcast.
 */
async function buildAndSendSponsored(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet,
  instructions: TransactionInstruction[],
  lookupTableAccounts?: Parameters<TransactionMessage["compileToV0Message"]>[0]
): Promise<string> {
  const serverPubkey = sponsorPubkey();
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: serverPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTableAccounts);

  const tx = new VersionedTransaction(message);

  const { signedTransaction } = await solanaWallet.signTransaction({
    transaction: tx.serialize(),
  });
  const userSignedTx = VersionedTransaction.deserialize(signedTransaction);

  const res = await fetch("/api/sponsor/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction: Buffer.from(userSignedTx.serialize()).toString("base64"),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? "Sponsor send failed");
  return data.signature as string;
}

/**
 * Create a 1-of-1 Squads multisig via the sponsor server.
 * Server is the Squads creator (pays account rent). User is the sole member
 * with full permissions. No SOL required from the user.
 * Persists multisigPda + vaultPda to localStorage.
 */
export async function createSageAccountSponsored(
  userPubkey: string
): Promise<{ multisigPda: PublicKey; vaultPda: PublicKey }> {
  const res = await fetch("/api/sponsor/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPubkey }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? "Sponsor create failed");

  const multisigPda = new PublicKey(data.multisigPda);
  const vaultPda = new PublicKey(data.vaultPda);

  localStorage.setItem(
    storageKey(userPubkey),
    JSON.stringify({ multisigPda: data.multisigPda, vaultPda: data.vaultPda })
  );

  return { multisigPda, vaultPda };
}

/**
 * Propose + immediately approve a vault transaction (threshold=1).
 * Server pays all fees and account rent. User signs as creator/member via Privy.
 * Returns the transaction index.
 */
export async function proposeTransactionSponsored(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet,
  multisigPda: PublicKey,
  innerInstructions: TransactionInstruction[],
  memo?: string
): Promise<bigint> {
  const serverPubkey = sponsorPubkey();
  const member = new PublicKey(solanaWallet.address);
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  const state = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda
  );
  const transactionIndex =
    multisig.utils.toBigInt(state.transactionIndex) + BigInt(1);

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const innerMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: blockhash,
    instructions: innerInstructions,
  });

  await buildAndSendSponsored(connection, solanaWallet, [
    multisig.instructions.vaultTransactionCreate({
      multisigPda,
      transactionIndex,
      creator: member,
      rentPayer: serverPubkey,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: innerMessage,
      memo,
    }),
    multisig.instructions.proposalCreate({
      multisigPda,
      creator: member,
      rentPayer: serverPubkey,
      transactionIndex,
    }),
    multisig.instructions.proposalApprove({
      multisigPda,
      transactionIndex,
      member,
    }),
  ]);

  return transactionIndex;
}

/**
 * Execute an approved vault transaction. Server pays the fee. User signs as
 * member via Privy. After execution, the server closes the vault transaction
 * and proposal accounts to reclaim rent (fire-and-forget).
 */
export async function executeTransactionSponsored(
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

  const sig = await buildAndSendSponsored(
    connection,
    solanaWallet,
    [instruction],
    lookupTableAccounts
  );

  // Fire-and-forget: server reclaims rent from the now-executed tx/proposal accounts.
  fetch("/api/sponsor/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      multisigPda: multisigPda.toBase58(),
      transactionIndex: transactionIndex.toString(),
    }),
  }).catch((e) => console.warn("[sponsor/close] rent reclaim failed:", e));

  return sig;
}

/**
 * Propose + execute in sequence (sponsored). Triggers 2 Privy signing prompts.
 * Returns the execute transaction signature.
 */
export async function proposeAndExecuteSponsored(
  connection: Connection,
  solanaWallet: ConnectedStandardSolanaWallet,
  multisigPda: PublicKey,
  innerInstructions: TransactionInstruction[],
  memo?: string
): Promise<string> {
  const txIndex = await proposeTransactionSponsored(
    connection,
    solanaWallet,
    multisigPda,
    innerInstructions,
    memo
  );
  return executeTransactionSponsored(connection, solanaWallet, multisigPda, txIndex);
}
