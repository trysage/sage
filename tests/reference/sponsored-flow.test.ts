/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAGE – Reference: Sponsored Transaction Flow
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Proves that a user with ZERO SOL can fully participate in a 1-of-1 multisig
 * when a server keypair sponsors all fees and rent.
 *
 * Roles:
 *   server  — fee payer for every transaction (funded, backend-controlled)
 *   user    — sole multisig member (no SOL at all, holds Privy embedded wallet)
 *
 * Every transaction is signed by BOTH parties:
 *   server  → pays fees and rent (payerKey + multisig creator)
 *   user    → authorises the multisig action (member signature)
 *
 * Flow:
 *   1. Create 1-of-1 multisig  — server pays + creates, user is sole member
 *   2. Fund vault              — airdrop directly to vault PDA
 *   3. vaultTransactionCreate  — server pays rent, user signs as creator
 *   4. proposalCreate          — server pays rent, user signs as creator
 *   5. proposalApprove         — server pays fee,  user signs as member
 *   6. vaultTransactionExecute — server pays fee,  user signs as member
 *   7. Assert user still has 0 SOL
 *
 * Run:
 *   npm run test:sponsored
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { expect } from "chai";
import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL ?? "http://localhost:8899";
const COMMIT  = "confirmed" as const;
const TRANSFER_LAMPORTS = Math.floor(0.1 * LAMPORTS_PER_SOL);

const { Permissions } = multisig.types;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const conn = () => new Connection(RPC_URL, COMMIT);

async function airdrop(connection: Connection, to: PublicKey, sol: number) {
  const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, COMMIT);
}

async function getTreasury(connection: Connection): Promise<PublicKey> {
  try {
    const [configPda] = multisig.getProgramConfigPda({});
    const cfg = await multisig.accounts.ProgramConfig.fromAccountAddress(connection, configPda);
    return cfg.treasury;
  } catch {
    return SystemProgram.programId;
  }
}

/**
 * Build, sign, send, and confirm a sponsored transaction.
 *
 * @param server   Fee payer — signs first, covers all fees + rent
 * @param signers  Additional signers required by the instructions (e.g. user, createKey)
 */
async function sendSponsored(
  connection: Connection,
  server: Keypair,
  signers: Keypair[],
  instructions: TransactionInstruction[]
): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash(COMMIT);

  const message = new TransactionMessage({
    payerKey: server.publicKey, // server covers all fees
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([server, ...signers]);

  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    COMMIT
  );
  return sig;
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("Reference – sponsored 1-of-1 flow (user holds zero SOL)", () => {
  let connection: Connection;
  let server: Keypair;   // fee payer — backend keypair
  let user: Keypair;     // multisig member — Privy embedded wallet (no SOL)
  let recipient: Keypair;

  let multisigPda: PublicKey;
  let vaultPda: PublicKey;
  let txIndex: bigint;

  before(async () => {
    connection = conn();

    server    = Keypair.generate();
    user      = Keypair.generate();
    recipient = Keypair.generate();

    // Only the server gets SOL — user starts and stays at 0
    await airdrop(connection, server.publicKey, 10);

    console.log(`\n  Server (fee payer) : ${server.publicKey.toBase58()}`);
    console.log(`  User   (member)    : ${user.publicKey.toBase58()}`);
    console.log(`  Recipient          : ${recipient.publicKey.toBase58()}`);
  });

  // ── Step 1: Create multisig ───────────────────────────────────────────────

  it("Step 1 – creates a 1-of-1 multisig, server pays and creates, user is sole member", async () => {
    const treasury  = await getTreasury(connection);
    const createKey = Keypair.generate();

    [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
    [vaultPda]    = multisig.getVaultPda({ multisigPda, index: 0 });

    // multisigCreateV2 charges rent to `creator` — making server the creator
    // means server covers both fees and rent; user is the sole member with full permissions.
    const ix = multisig.instructions.multisigCreateV2({
      treasury,
      creator:         server.publicKey,
      multisigPda,
      configAuthority: null,
      threshold:       1,
      members: [
        { key: user.publicKey, permissions: Permissions.all() },
      ],
      timeLock:      0,
      createKey:     createKey.publicKey,
      rentCollector: null,
    });

    // server is creator + fee payer; createKey must co-sign (program requires it)
    await sendSponsored(connection, server, [createKey], [ix]);

    const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
    expect(ms.threshold).to.equal(1);
    expect(ms.members).to.have.length(1);
    expect(ms.members[0].key.toBase58()).to.equal(user.publicKey.toBase58());

    console.log(`\n  Multisig PDA : ${multisigPda.toBase58()}`);
    console.log(`  Vault PDA    : ${vaultPda.toBase58()}`);
  });

  // ── Step 2: Fund vault ────────────────────────────────────────────────────

  it("Step 2 – funds the vault (server airdrop to vault PDA)", async () => {
    await airdrop(connection, vaultPda, 1);
    const balance = await connection.getBalance(vaultPda);
    expect(balance).to.be.at.least(LAMPORTS_PER_SOL);
    console.log(`\n  Vault balance : ${balance / LAMPORTS_PER_SOL} SOL`);
  });

  // ── Step 3: vaultTransactionCreate ───────────────────────────────────────

  it("Step 3 – server-sponsored vaultTransactionCreate, user signs as creator", async () => {
    const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
    txIndex = multisig.utils.toBigInt(ms.transactionIndex) + BigInt(1);

    const { blockhash } = await connection.getLatestBlockhash(COMMIT);
    const innerMessage = new TransactionMessage({
      payerKey:        vaultPda,
      recentBlockhash: blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: vaultPda,
          toPubkey:   recipient.publicKey,
          lamports:   TRANSFER_LAMPORTS,
        }),
      ],
    });

    await sendSponsored(connection, server, [user], [
      multisig.instructions.vaultTransactionCreate({
        multisigPda,
        transactionIndex: txIndex,
        creator:          user.publicKey,
        rentPayer:        server.publicKey, // server covers the account rent
        vaultIndex:       0,
        ephemeralSigners: 0,
        transactionMessage: innerMessage,
        memo: "sponsored: 0.1 SOL transfer",
      }),
    ]);

    console.log(`\n  Transaction index : ${txIndex}`);
  });

  // ── Step 4: proposalCreate ────────────────────────────────────────────────

  it("Step 4 – server-sponsored proposalCreate, user signs as creator", async () => {
    await sendSponsored(connection, server, [user], [
      multisig.instructions.proposalCreate({
        multisigPda,
        creator:          user.publicKey,
        rentPayer:        server.publicKey, // server covers the account rent
        transactionIndex: txIndex,
      }),
    ]);

    const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex: txIndex });
    const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);
    expect((proposal.status as { __kind: string }).__kind).to.equal("Active");
    console.log(`\n  Proposal status : Active`);
  });

  // ── Step 5: proposalApprove ───────────────────────────────────────────────

  it("Step 5 – server-sponsored proposalApprove, user signs as member → Approved", async () => {
    await sendSponsored(connection, server, [user], [
      multisig.instructions.proposalApprove({
        multisigPda,
        transactionIndex: txIndex,
        member:           user.publicKey,
      }),
    ]);

    const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex: txIndex });
    const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);
    expect((proposal.status as { __kind: string }).__kind).to.equal("Approved");
    console.log(`\n  Proposal status : Approved ✓`);
  });

  // ── Step 6: vaultTransactionExecute ──────────────────────────────────────

  it("Step 6 – server-sponsored execute, funds land in recipient", async () => {
    const balanceBefore = await connection.getBalance(recipient.publicKey);

    const { instruction, lookupTableAccounts } =
      await multisig.instructions.vaultTransactionExecute({
        connection,
        multisigPda,
        transactionIndex: txIndex,
        member:           user.publicKey,
      });

    await sendSponsored(connection, server, [user], [instruction]);
    // (lookupTableAccounts passed to compileToV0Message if ALTs are used)

    const balanceAfter = await connection.getBalance(recipient.publicKey);
    expect(balanceAfter - balanceBefore).to.equal(TRANSFER_LAMPORTS);

    console.log(`\n  Recipient received : ${TRANSFER_LAMPORTS / LAMPORTS_PER_SOL} SOL ✓`);
  });

  // ── Step 7: Assert user never spent SOL ──────────────────────────────────

  it("Step 7 – user wallet balance is still 0 SOL", async () => {
    const userBalance = await connection.getBalance(user.publicKey);
    expect(userBalance).to.equal(0);
    console.log(`\n  User balance : ${userBalance} lamports (zero — all fees paid by server) ✓`);
  });
});
