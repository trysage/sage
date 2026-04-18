/**
 * Sage – Proposal lifecycle tests
 *
 * Shares one funded keypair pair across all tests; each test gets a fresh multisig PDA.
 * Every on-chain call is followed by confirmTransaction so dependent steps see committed state.
 */
import { expect } from "chai";
import * as multisig from "@sqds/multisig";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
} from "@solana/web3.js";
import {
  airdrop,
  confirm,
  createFreshMultisig,
  initSuiteWallets,
  getNextTransactionIndex,
  MultisigFixture,
  SuiteWallets,
  COMMITMENT,
} from "./helpers/setup";

let wallets: SuiteWallets;

async function fundedMultisig(): Promise<MultisigFixture> {
  const fixture = await createFreshMultisig(wallets, 2);
  await airdrop(fixture.connection, fixture.vaultPda, 2);
  return fixture;
}

async function buildTransferMessage(
  fixture: MultisigFixture,
  lamports: number = Math.floor(0.1 * LAMPORTS_PER_SOL)
) {
  const blockhash = (await fixture.connection.getLatestBlockhash()).blockhash;
  return new TransactionMessage({
    payerKey: fixture.vaultPda,
    recentBlockhash: blockhash,
    instructions: [
      SystemProgram.transfer({
        fromPubkey: fixture.vaultPda,
        toPubkey: fixture.creator.publicKey,
        lamports,
      }),
    ],
  });
}

async function createAndPropose(fixture: MultisigFixture) {
  const txIndex = await getNextTransactionIndex(fixture.connection, fixture.multisigPda);
  const message = await buildTransferMessage(fixture);

  await confirm(
    fixture.connection,
    await multisig.rpc.vaultTransactionCreate({
      connection: fixture.connection,
      feePayer: fixture.creator,
      multisigPda: fixture.multisigPda,
      transactionIndex: txIndex,
      creator: fixture.creator.publicKey,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: message,
      sendOptions: { skipPreflight: false },
    })
  );

  await confirm(
    fixture.connection,
    await multisig.rpc.proposalCreate({
      connection: fixture.connection,
      feePayer: fixture.creator,
      multisigPda: fixture.multisigPda,
      transactionIndex: txIndex,
      creator: fixture.creator,
      sendOptions: { skipPreflight: false },
    })
  );

  return txIndex;
}

describe("Proposal – full lifecycle", () => {
  before(async () => {
    wallets = await initSuiteWallets();
  });

  // ─── Vault transaction creation ────────────────────────────────────────────

  describe("vaultTransactionCreate", () => {
    it("creates a vault transaction and increments transactionIndex", async () => {
      const fixture = await fundedMultisig();
      const txIndex = await getNextTransactionIndex(fixture.connection, fixture.multisigPda);
      const message = await buildTransferMessage(fixture);

      await confirm(
        fixture.connection,
        await multisig.rpc.vaultTransactionCreate({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          creator: fixture.creator.publicKey,
          vaultIndex: 0,
          ephemeralSigners: 0,
          transactionMessage: message,
          memo: "Sage: test transfer",
          sendOptions: { skipPreflight: false },
        })
      );

      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      expect(Number(ms.transactionIndex.toString())).to.equal(Number(txIndex));
    });

    it("vault transaction account is fetchable by PDA after creation", async () => {
      const fixture = await fundedMultisig();
      const txIndex = await getNextTransactionIndex(fixture.connection, fixture.multisigPda);
      const message = await buildTransferMessage(fixture);

      await confirm(
        fixture.connection,
        await multisig.rpc.vaultTransactionCreate({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          creator: fixture.creator.publicKey,
          vaultIndex: 0,
          ephemeralSigners: 0,
          transactionMessage: message,
          sendOptions: { skipPreflight: false },
        })
      );

      const [txPda] = multisig.getTransactionPda({
        multisigPda: fixture.multisigPda,
        index: txIndex,
      });
      const txAccount = await multisig.accounts.VaultTransaction.fromAccountAddress(
        fixture.connection,
        txPda
      );
      expect(txAccount).to.not.be.undefined;
    });
  });

  // ─── Proposal creation ─────────────────────────────────────────────────────

  describe("proposalCreate", () => {
    it("creates a proposal with 0 approvals and 0 rejections", async () => {
      const fixture = await fundedMultisig();
      const txIndex = await createAndPropose(fixture);

      const [proposalPda] = multisig.getProposalPda({
        multisigPda: fixture.multisigPda,
        transactionIndex: txIndex,
      });
      const proposal = await multisig.accounts.Proposal.fromAccountAddress(
        fixture.connection,
        proposalPda
      );

      expect(proposal.approved).to.have.length(0);
      expect(proposal.rejected).to.have.length(0);
    });
  });

  // ─── Approval & quorum ─────────────────────────────────────────────────────

  describe("proposalApprove", () => {
    it("records creator's approval", async () => {
      const fixture = await fundedMultisig();
      const txIndex = await createAndPropose(fixture);

      await confirm(
        fixture.connection,
        await multisig.rpc.proposalApprove({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          member: fixture.creator,
          sendOptions: { skipPreflight: false },
        })
      );

      const [proposalPda] = multisig.getProposalPda({
        multisigPda: fixture.multisigPda,
        transactionIndex: txIndex,
      });
      const proposal = await multisig.accounts.Proposal.fromAccountAddress(
        fixture.connection,
        proposalPda
      );
      expect(proposal.approved).to.have.length(1);
      expect(proposal.approved[0].toBase58()).to.equal(fixture.creator.publicKey.toBase58());
    });

    it("reaches quorum after 2 approvals and status becomes 'approved'", async () => {
      const fixture = await fundedMultisig();
      const txIndex = await createAndPropose(fixture);

      await confirm(
        fixture.connection,
        await multisig.rpc.proposalApprove({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          member: fixture.creator,
          sendOptions: { skipPreflight: false },
        })
      );
      await confirm(
        fixture.connection,
        await multisig.rpc.proposalApprove({
          connection: fixture.connection,
          feePayer: fixture.members[0],
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          member: fixture.members[0],
          sendOptions: { skipPreflight: false },
        })
      );

      const [proposalPda] = multisig.getProposalPda({
        multisigPda: fixture.multisigPda,
        transactionIndex: txIndex,
      });
      const proposal = await multisig.accounts.Proposal.fromAccountAddress(
        fixture.connection,
        proposalPda
      );
      expect(proposal.approved).to.have.length(2);
      expect((proposal.status as { __kind: string }).__kind).to.equal("Approved");
    });
  });

  // ─── Rejection ─────────────────────────────────────────────────────────────

  describe("proposalReject", () => {
    it("records a rejection from the voter member", async () => {
      const fixture = await fundedMultisig();
      const txIndex = await createAndPropose(fixture);

      await confirm(
        fixture.connection,
        await multisig.rpc.proposalReject({
          connection: fixture.connection,
          feePayer: fixture.members[0],
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          member: fixture.members[0],
          sendOptions: { skipPreflight: false },
        })
      );

      const [proposalPda] = multisig.getProposalPda({
        multisigPda: fixture.multisigPda,
        transactionIndex: txIndex,
      });
      const proposal = await multisig.accounts.Proposal.fromAccountAddress(
        fixture.connection,
        proposalPda
      );
      expect(proposal.rejected).to.have.length(1);
      expect(proposal.rejected[0].toBase58()).to.equal(fixture.members[0].publicKey.toBase58());
    });
  });

  // ─── Execution ─────────────────────────────────────────────────────────────

  describe("vaultTransactionExecute", () => {
    it("executes an approved transfer and increases creator balance", async () => {
      const fixture = await fundedMultisig();
      const txIndex = await createAndPropose(fixture);

      await confirm(
        fixture.connection,
        await multisig.rpc.proposalApprove({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          member: fixture.creator,
          sendOptions: { skipPreflight: false },
        })
      );
      await confirm(
        fixture.connection,
        await multisig.rpc.proposalApprove({
          connection: fixture.connection,
          feePayer: fixture.members[0],
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          member: fixture.members[0],
          sendOptions: { skipPreflight: false },
        })
      );

      const balanceBefore = await fixture.connection.getBalance(fixture.creator.publicKey);

      await confirm(
        fixture.connection,
        await multisig.rpc.vaultTransactionExecute({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          member: fixture.creator.publicKey,
          signers: [fixture.creator],
          sendOptions: { skipPreflight: false },
        })
      );

      const balanceAfter = await fixture.connection.getBalance(fixture.creator.publicKey);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
  });
});
