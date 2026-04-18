/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAGE – Reference: 2-of-2 Multisig Transfer Flow
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This file is the canonical bootstrap reference for the Sage agentic co-signer.
 * It shows the complete lifecycle of a SOL transfer through a Squads V4 multisig
 * with exactly two signers:
 *
 *   Signer 1 — PROPOSER  (human wallet / dApp)
 *   Signer 2 — AGENT     (Sage co-signer — reviews and approves/rejects)
 *
 * The agent's decision point is clearly marked with  ← SAGE AGENT HOOK
 * That is where policy evaluation, risk scoring, and approval logic will live.
 *
 * Flow:
 *   1. Create 2-of-2 multisig  (proposer + agent as members)
 *   2. Fund the vault
 *   3. Proposer creates a vault transaction
 *   4. Proposer creates a proposal and casts their approval
 *   5. ← SAGE AGENT: inspect the pending proposal, decide approve/reject
 *   6. Agent approves  →  quorum reached  →  proposal status: Approved
 *   7. Execute the transaction  →  lamports land in recipient wallet
 *
 * Run:
 *   npm run test:reference
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
  TransactionMessage,
} from "@solana/web3.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL   = process.env.RPC_URL ?? "http://localhost:8899";
const COMMIT    = "confirmed" as const;
const THRESHOLD = 2; // both signers must approve

const { Permissions, Permission } = multisig.types;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const conn = () => new Connection(RPC_URL, COMMIT);

async function airdrop(connection: Connection, to: PublicKey, sol: number) {
  const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, COMMIT);
}

/** Wraps any Squads RPC call: sends + waits for on-chain confirmation. */
async function sendAndConfirm(
  connection: Connection,
  rpcCall: Promise<string>
): Promise<string> {
  const sig = await rpcCall;
  await connection.confirmTransaction(sig, COMMIT);
  return sig;
}

/** Derives the Squads program config treasury (needed for multisig creation). */
async function getTreasury(connection: Connection): Promise<PublicKey> {
  try {
    const [configPda] = multisig.getProgramConfigPda({});
    const cfg = await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      configPda
    );
    return cfg.treasury;
  } catch {
    return SystemProgram.programId; // local validator fallback
  }
}

// ─── Reference test ──────────────────────────────────────────────────────────

describe("Reference – 2-of-2 multisig transfer flow", () => {
  // Roles
  let proposer: Keypair; // Signer 1: human / dApp wallet
  let agent:    Keypair; // Signer 2: Sage co-signer (the agentic wallet)
  let recipient: Keypair; // where funds are sent

  // Squads accounts
  let multisigPda: PublicKey;
  let vaultPda:    PublicKey;
  let createKey:   Keypair;

  let connection: Connection;
  const TRANSFER_LAMPORTS = 0.5 * LAMPORTS_PER_SOL;

  // ── Setup ──────────────────────────────────────────────────────────────────

  before(async () => {
    connection = conn();
    console.log(`\n  RPC : ${RPC_URL}`);

    proposer  = Keypair.generate();
    agent     = Keypair.generate();
    recipient = Keypair.generate();

    console.log(`  Proposer  : ${proposer.publicKey.toBase58()}`);
    console.log(`  Agent     : ${agent.publicKey.toBase58()}`);
    console.log(`  Recipient : ${recipient.publicKey.toBase58()}`);

    // Fund both signers from the local faucet
    await airdrop(connection, proposer.publicKey, 10);
    await airdrop(connection, agent.publicKey,    2);
  });

  // ── Step 1: Create 2-of-2 multisig ────────────────────────────────────────

  it("Step 1 – creates a 2-of-2 multisig (proposer + agent)", async () => {
    const treasury = await getTreasury(connection);
    createKey = Keypair.generate();

    [multisigPda]  = multisig.getMultisigPda({ createKey: createKey.publicKey });
    [vaultPda]     = multisig.getVaultPda({ multisigPda, index: 0 });

    await sendAndConfirm(
      connection,
      multisig.rpc.multisigCreateV2({
        connection,
        treasury,
        createKey,
        creator: proposer,
        multisigPda,
        configAuthority: null,
        timeLock: 0,
        members: [
          // Proposer: can initiate, vote, and execute
          { key: proposer.publicKey, permissions: Permissions.all() },
          // Agent: vote permission only — it reviews and approves/rejects
          { key: agent.publicKey, permissions: Permissions.fromPermissions([Permission.Vote]) },
        ],
        threshold: THRESHOLD,
        rentCollector: null,
        sendOptions: { skipPreflight: false },
      })
    );

    const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
    expect(ms.threshold).to.equal(THRESHOLD);
    expect(ms.members).to.have.length(2);

    console.log(`\n  Multisig PDA : ${multisigPda.toBase58()}`);
    console.log(`  Vault PDA    : ${vaultPda.toBase58()}`);
  });

  // ── Step 2: Fund vault ─────────────────────────────────────────────────────

  it("Step 2 – funds the vault with 2 SOL", async () => {
    await airdrop(connection, vaultPda, 2);
    const balance = await connection.getBalance(vaultPda);
    expect(balance).to.be.at.least(2 * LAMPORTS_PER_SOL);
    console.log(`\n  Vault balance : ${balance / LAMPORTS_PER_SOL} SOL`);
  });

  // ── Step 3: Proposer creates a vault transaction ───────────────────────────

  let txIndex: bigint;

  it("Step 3 – proposer creates a vault transaction (0.5 SOL transfer)", async () => {
    const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
    txIndex = BigInt(ms.transactionIndex.toString()) + 1n;

    const blockhash = (await connection.getLatestBlockhash()).blockhash;
    const message = new TransactionMessage({
      payerKey: vaultPda,
      recentBlockhash: blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: vaultPda,
          toPubkey:   recipient.publicKey,
          lamports:   TRANSFER_LAMPORTS,
        }),
      ],
    });

    await sendAndConfirm(
      connection,
      multisig.rpc.vaultTransactionCreate({
        connection,
        feePayer: proposer,
        multisigPda,
        transactionIndex: txIndex,
        creator: proposer.publicKey,
        vaultIndex: 0,
        ephemeralSigners: 0,
        transactionMessage: message,
        memo: "Sage: transfer 0.5 SOL to recipient",
        sendOptions: { skipPreflight: false },
      })
    );

    console.log(`\n  Transaction index : ${txIndex}`);
    console.log(`  Transfer amount   : ${TRANSFER_LAMPORTS / LAMPORTS_PER_SOL} SOL`);
    console.log(`  To recipient      : ${recipient.publicKey.toBase58()}`);
  });

  // ── Step 4: Proposer creates proposal + casts first approval ──────────────

  it("Step 4 – proposer opens a proposal and casts approval #1", async () => {
    await sendAndConfirm(
      connection,
      multisig.rpc.proposalCreate({
        connection,
        feePayer: proposer,
        multisigPda,
        transactionIndex: txIndex,
        creator: proposer,
        sendOptions: { skipPreflight: false },
      })
    );

    await sendAndConfirm(
      connection,
      multisig.rpc.proposalApprove({
        connection,
        feePayer: proposer,
        multisigPda,
        transactionIndex: txIndex,
        member: proposer,
        sendOptions: { skipPreflight: false },
      })
    );

    const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex: txIndex });
    const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);

    expect(proposal.approved).to.have.length(1);
    expect((proposal.status as { __kind: string }).__kind).to.not.equal("Approved"); // not yet — need agent

    console.log(`\n  Approval #1 cast by proposer`);
    console.log(`  Proposal status   : ${(proposal.status as { __kind: string }).__kind}`);
    console.log(`  Approvals so far  : ${proposal.approved.length} / ${THRESHOLD}`);
  });

  // ── Step 5: SAGE AGENT DECISION POINT ─────────────────────────────────────
  //
  //   Everything above this step is standard Squads multisig flow.
  //   Everything below this comment is where Sage's agentic co-signer acts.
  //
  //   The agent will:
  //     1. Be notified of (or poll for) pending proposals awaiting its vote
  //     2. Fetch and inspect the pending VaultTransaction
  //     3. Run the transaction through a policy engine / risk scorer
  //     4. Approve  → if the transaction is within policy
  //        Reject   → if it violates policy (destination blocklist, amount limit, etc.)
  //
  //   In production this step is async and driven by an off-chain agent process.
  //   Here we simulate an unconditional approval for reference purposes.
  // ──────────────────────────────────────────────────────────────────────────

  it("Step 5 – agent inspects the pending proposal", async () => {
    const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex: txIndex });
    const [txPda]       = multisig.getTransactionPda({ multisigPda, index: txIndex });

    const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);
    const vaultTx  = await multisig.accounts.VaultTransaction.fromAccountAddress(connection, txPda);

    // ── What the agent sees ──────────────────────────────────────────────────
    console.log("\n  ┌── SAGE AGENT: Pending proposal review ────────────────────");
    console.log(`  │  Proposal PDA    : ${proposalPda.toBase58()}`);
    console.log(`  │  Status          : ${(proposal.status as { __kind: string }).__kind}`);
    console.log(`  │  Approvals       : ${proposal.approved.length} / ${THRESHOLD}`);
    console.log(`  │  Approved by     : ${proposal.approved.map((k: PublicKey) => k.toBase58().slice(0, 8) + "…")}`);
    console.log(`  │  Transaction PDA : ${txPda.toBase58()}`);
    console.log(`  │  Vault index     : ${vaultTx.vaultIndex}`);
    console.log("  └───────────────────────────────────────────────────────────");

    // ── Assertions the agent checks before approving ─────────────────────────
    //   Replace these with real policy rules:
    //     - destination not on blocklist
    //     - amount within daily limit
    //     - no suspicious instruction types
    //     - simulation passes (no unexpected state changes)
    expect(proposal.approved).to.have.length(1);         // exactly one prior approval
    expect(proposal.rejected).to.have.length(0);         // no rejections
    expect((proposal.status as { __kind: string }).__kind).to.equal("Active"); // still open

    // Simulate policy check: amount ≤ 1 SOL is within limit
    const amountSol = TRANSFER_LAMPORTS / LAMPORTS_PER_SOL;
    const POLICY_MAX_SOL = 1.0;
    expect(amountSol).to.be.at.most(POLICY_MAX_SOL);    // ← swap for real policy engine

    console.log(`\n  Agent decision: APPROVE (${amountSol} SOL ≤ policy limit of ${POLICY_MAX_SOL} SOL)`);
  });

  // ── Step 6: Agent approves → quorum reached ────────────────────────────────

  it("Step 6 – agent casts approval #2 → quorum reached", async () => {
    await sendAndConfirm(
      connection,
      multisig.rpc.proposalApprove({
        connection,
        feePayer: agent,        // agent pays its own tx fee
        multisigPda,
        transactionIndex: txIndex,
        member: agent,
        sendOptions: { skipPreflight: false },
      })
    );

    const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex: txIndex });
    const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);

    expect(proposal.approved).to.have.length(2);
    expect((proposal.status as { __kind: string }).__kind).to.equal("Approved");

    console.log(`\n  Approval #2 cast by agent`);
    console.log(`  Proposal status   : ${(proposal.status as { __kind: string }).__kind} ✓`);
    console.log(`  Approvals         : ${proposal.approved.length} / ${THRESHOLD}`);
  });

  // ── Step 7: Execute the transaction ───────────────────────────────────────

  it("Step 7 – executes the approved transaction and verifies recipient balance", async () => {
    const balanceBefore = await connection.getBalance(recipient.publicKey);

    await sendAndConfirm(
      connection,
      multisig.rpc.vaultTransactionExecute({
        connection,
        feePayer: proposer,
        multisigPda,
        transactionIndex: txIndex,
        member: proposer.publicKey,
        signers: [proposer],
        sendOptions: { skipPreflight: false },
      })
    );

    const balanceAfter = await connection.getBalance(recipient.publicKey);
    const received     = (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL;

    expect(balanceAfter).to.be.greaterThan(balanceBefore);

    console.log(`\n  Recipient balance before : ${balanceBefore / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Recipient balance after  : ${balanceAfter  / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Received                 : ${received} SOL ✓`);
    console.log("\n  ✅  Transfer complete — full 2-of-2 co-signer flow verified\n");
  });
});
