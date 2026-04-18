/**
 * Sage – Multisig lifecycle tests
 *
 * Offline tests (PDA, permissions) run instantly without network.
 * On-chain tests share a single funded keypair pair to avoid airdrop rate limits.
 */
import { expect } from "chai";
import * as multisig from "@sqds/multisig";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  airdrop,
  createFreshMultisig,
  initSuiteWallets,
  SuiteWallets,
  RPC_URL,
} from "./helpers/setup";

const { Permission, Permissions } = multisig.types;

describe("Multisig – creation & account state", () => {
  let wallets: SuiteWallets;

  before(async () => {
    console.log(`\n  RPC: ${RPC_URL}`);
    wallets = await initSuiteWallets();
  });

  // ─── Offline: PDA derivation ─────────────────────────────────────────────────

  describe("PDA derivation (offline)", () => {
    it("derives a deterministic multisig PDA from createKey", () => {
      const { Keypair } = require("@solana/web3.js");
      const createKey = Keypair.generate();
      const [pda1] = multisig.getMultisigPda({ createKey: createKey.publicKey });
      const [pda2] = multisig.getMultisigPda({ createKey: createKey.publicKey });
      expect(pda1.toBase58()).to.equal(pda2.toBase58());
    });

    it("produces distinct PDAs for different createKeys", () => {
      const { Keypair } = require("@solana/web3.js");
      const [pda1] = multisig.getMultisigPda({ createKey: Keypair.generate().publicKey });
      const [pda2] = multisig.getMultisigPda({ createKey: Keypair.generate().publicKey });
      expect(pda1.toBase58()).to.not.equal(pda2.toBase58());
    });

    it("derives vault PDA at index 0 deterministically", () => {
      const { Keypair } = require("@solana/web3.js");
      const [multisigPda] = multisig.getMultisigPda({ createKey: Keypair.generate().publicKey });
      const [v1] = multisig.getVaultPda({ multisigPda, index: 0 });
      const [v2] = multisig.getVaultPda({ multisigPda, index: 0 });
      expect(v1.toBase58()).to.equal(v2.toBase58());
    });

    it("derives distinct vault PDAs for different indexes", () => {
      const { Keypair } = require("@solana/web3.js");
      const [multisigPda] = multisig.getMultisigPda({ createKey: Keypair.generate().publicKey });
      const [v0] = multisig.getVaultPda({ multisigPda, index: 0 });
      const [v1] = multisig.getVaultPda({ multisigPda, index: 1 });
      expect(v0.toBase58()).to.not.equal(v1.toBase58());
    });
  });

  // ─── Offline: Permission bitmask ─────────────────────────────────────────────

  describe("Permission bitmask helpers (offline)", () => {
    it("Permissions.all() mask is non-zero", () => {
      expect(Permissions.all().mask).to.be.greaterThan(0);
    });

    it("fromPermissions([Vote]) is a strict subset of all()", () => {
      const voteOnly = Permissions.fromPermissions([Permission.Vote]);
      expect(voteOnly.mask).to.be.lessThan(Permissions.all().mask);
    });

    it("fromPermissions([Initiate, Vote, Execute]) equals all()", () => {
      const explicit = Permissions.fromPermissions([
        Permission.Initiate,
        Permission.Vote,
        Permission.Execute,
      ]);
      expect(explicit.mask).to.equal(Permissions.all().mask);
    });
  });

  // ─── On-chain: multisig creation ─────────────────────────────────────────────

  describe("multisigCreateV2 (on-chain)", () => {
    it("creates a 2-of-2 multisig and reads back account state", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );

      expect(ms.threshold).to.equal(2);
      expect(ms.members).to.have.length(2);
      const keys = ms.members.map((m: { key: PublicKey }) => m.key.toBase58());
      expect(keys).to.include(wallets.creator.publicKey.toBase58());
      expect(keys).to.include(wallets.voter.publicKey.toBase58());
    });

    it("initialises transactionIndex to 0 on a fresh multisig", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      expect(Number(ms.transactionIndex.toString())).to.equal(0);
    });

    it("creator has full (all) permissions", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      const creatorEntry = ms.members.find(
        (m: { key: PublicKey }) => m.key.toBase58() === wallets.creator.publicKey.toBase58()
      );
      expect(creatorEntry).to.not.be.undefined;
      expect(creatorEntry!.permissions.mask).to.equal(Permissions.all().mask);
    });

    it("voter has vote-only permissions", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      const ms = await multisig.accounts.Multisig.fromAccountAddress(
        fixture.connection,
        fixture.multisigPda
      );
      const voterEntry = ms.members.find(
        (m: { key: PublicKey }) => m.key.toBase58() === wallets.voter.publicKey.toBase58()
      );
      expect(voterEntry).to.not.be.undefined;
      expect(voterEntry!.permissions.mask).to.equal(
        Permissions.fromPermissions([Permission.Vote]).mask
      );
    });

    it("funds vault PDA and confirms balance", async () => {
      const fixture = await createFreshMultisig(wallets, 2);
      await airdrop(fixture.connection, fixture.vaultPda, 1);
      const balance = await fixture.connection.getBalance(fixture.vaultPda);
      expect(balance).to.be.at.least(LAMPORTS_PER_SOL);
    });
  });
});
