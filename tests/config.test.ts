/**
 * Sage – Config transaction tests
 *
 * Shares one funded keypair pair; each test creates a fresh multisig PDA.
 * Every on-chain call is confirmed before the next step proceeds.
 */
import { expect } from "chai";
import * as multisig from "@sqds/multisig";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  confirm,
  createFreshMultisig,
  initSuiteWallets,
  getNextTransactionIndex,
  MultisigFixture,
  SuiteWallets,
} from "./helpers/setup";

const { Permission, Permissions } = multisig.types;

let wallets: SuiteWallets;

async function proposeAndApproveConfig(
  fixture: MultisigFixture,
  actions: multisig.types.ConfigAction[]
): Promise<bigint> {
  const txIndex = await getNextTransactionIndex(fixture.connection, fixture.multisigPda);

  await confirm(
    fixture.connection,
    await multisig.rpc.configTransactionCreate({
      connection: fixture.connection,
      feePayer: fixture.creator,
      multisigPda: fixture.multisigPda,
      transactionIndex: txIndex,
      creator: fixture.creator.publicKey,
      actions,
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

  return txIndex;
}

describe("Config transactions – member & threshold management", () => {
  before(async () => {
    wallets = await initSuiteWallets();
  });

  // ─── Add member ─────────────────────────────────────────────────────────────

  describe("AddMember", () => {
    it("adds a new member and reflects the change on-chain after execution", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      const newMember = Keypair.generate();

      const txIndex = await proposeAndApproveConfig(fixture, [
        {
          __kind: "AddMember",
          newMember: {
            key: newMember.publicKey,
            permissions: Permissions.fromPermissions([Permission.Vote]),
          },
        },
      ]);

      await confirm(
        fixture.connection,
        await multisig.rpc.configTransactionExecute({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          rentPayer: fixture.creator,
          member: fixture.creator,
          signers: [fixture.creator],
          sendOptions: { skipPreflight: false },
        })
      );

      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      const keys = ms.members.map((m: { key: PublicKey }) => m.key.toBase58());
      expect(keys).to.include(newMember.publicKey.toBase58());
      expect(ms.members).to.have.length(3);
    });
  });

  // ─── Change threshold ───────────────────────────────────────────────────────

  describe("ChangeThreshold", () => {
    it("changes threshold from 2 to 1 and reflects on-chain", async () => {
      const fixture = await createFreshMultisig(wallets, 2);

      const txIndex = await proposeAndApproveConfig(fixture, [
        { __kind: "ChangeThreshold", newThreshold: 1 },
      ]);

      await confirm(
        fixture.connection,
        await multisig.rpc.configTransactionExecute({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          rentPayer: fixture.creator,
          member: fixture.creator,
          signers: [fixture.creator],
          sendOptions: { skipPreflight: false },
        })
      );

      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      expect(ms.threshold).to.equal(1);
    });
  });

  // ─── Remove member ──────────────────────────────────────────────────────────

  describe("RemoveMember", () => {
    it("removes the voter member after lowering threshold to 1", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      const toRemove = fixture.members[0];

      // Lower threshold first so we can still operate solo after removal
      const thresholdTxIndex = await proposeAndApproveConfig(fixture, [
        { __kind: "ChangeThreshold", newThreshold: 1 },
      ]);
      await confirm(
        fixture.connection,
        await multisig.rpc.configTransactionExecute({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: thresholdTxIndex,
          rentPayer: fixture.creator,
          member: fixture.creator,
          signers: [fixture.creator],
          sendOptions: { skipPreflight: false },
        })
      );

      // Now remove with threshold=1 (creator approval only)
      const removeTxIndex = await getNextTransactionIndex(fixture.connection, fixture.multisigPda);

      await confirm(
        fixture.connection,
        await multisig.rpc.configTransactionCreate({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: removeTxIndex,
          creator: fixture.creator.publicKey,
          actions: [{ __kind: "RemoveMember", oldMember: toRemove.publicKey }],
          sendOptions: { skipPreflight: false },
        })
      );

      await confirm(
        fixture.connection,
        await multisig.rpc.proposalCreate({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: removeTxIndex,
          creator: fixture.creator,
          sendOptions: { skipPreflight: false },
        })
      );

      await confirm(
        fixture.connection,
        await multisig.rpc.proposalApprove({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: removeTxIndex,
          member: fixture.creator,
          sendOptions: { skipPreflight: false },
        })
      );

      await confirm(
        fixture.connection,
        await multisig.rpc.configTransactionExecute({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: removeTxIndex,
          rentPayer: fixture.creator,
          member: fixture.creator,
          signers: [fixture.creator],
          sendOptions: { skipPreflight: false },
        })
      );

      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      const keys = ms.members.map((m: { key: PublicKey }) => m.key.toBase58());
      expect(keys).to.not.include(toRemove.publicKey.toBase58());
      expect(ms.members).to.have.length(1);
    });
  });

  // ─── Batch config ───────────────────────────────────────────────────────────

  describe("Batch config actions", () => {
    it("adds two members in a single config transaction", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      const memberA = Keypair.generate();
      const memberB = Keypair.generate();

      const txIndex = await proposeAndApproveConfig(fixture, [
        {
          __kind: "AddMember",
          newMember: {
            key: memberA.publicKey,
            permissions: Permissions.fromPermissions([Permission.Vote]),
          },
        },
        {
          __kind: "AddMember",
          newMember: {
            key: memberB.publicKey,
            permissions: Permissions.fromPermissions([Permission.Vote]),
          },
        },
      ]);

      await confirm(
        fixture.connection,
        await multisig.rpc.configTransactionExecute({
          connection: fixture.connection,
          feePayer: fixture.creator,
          multisigPda: fixture.multisigPda,
          transactionIndex: txIndex,
          rentPayer: fixture.creator,
          member: fixture.creator,
          signers: [fixture.creator],
          sendOptions: { skipPreflight: false },
        })
      );

      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      const keys = ms.members.map((m: { key: PublicKey }) => m.key.toBase58());
      expect(keys).to.include(memberA.publicKey.toBase58());
      expect(keys).to.include(memberB.publicKey.toBase58());
      expect(ms.members).to.have.length(4);
    });
  });
});
