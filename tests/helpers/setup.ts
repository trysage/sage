import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

export const RPC_URL = process.env.RPC_URL ?? "http://localhost:8899";
export const COMMITMENT = "confirmed" as const;

export function getConnection(): Connection {
  return new Connection(RPC_URL, COMMITMENT);
}

export async function airdrop(
  connection: Connection,
  pubkey: PublicKey,
  sol: number = 2
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, COMMITMENT);
}

/**
 * Fetches the Squads program config treasury.
 * Falls back to SystemProgram.programId on local validators without a config.
 */
export async function getProgramTreasury(
  connection: Connection,
  programId?: PublicKey
): Promise<PublicKey> {
  try {
    const [programConfigPda] = multisig.getProgramConfigPda({ programId });
    const config = await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      programConfigPda
    );
    return config.treasury;
  } catch {
    return SystemProgram.programId;
  }
}

// ─── Global wallet singleton (airdrop once for the entire test run) ──────────

export interface SuiteWallets {
  connection: Connection;
  creator: Keypair;
  voter: Keypair;
  treasury: PublicKey;
}

let _wallets: SuiteWallets | null = null;

/**
 * Returns the global shared wallets, initialising and airdropping only on the
 * first call. Subsequent calls return the cached result — no extra airdrop.
 *
 * creator → 10 SOL (covers many multisig + fee payments)
 * voter   → 2 SOL  (signing fees only)
 */
export async function initSuiteWallets(): Promise<SuiteWallets> {
  if (_wallets) return _wallets;

  const connection = getConnection();
  const creator = Keypair.generate();
  const voter = Keypair.generate();

  await airdrop(connection, creator.publicKey, 10);
  await airdrop(connection, voter.publicKey, 2);

  const treasury = await getProgramTreasury(connection);
  _wallets = { connection, creator, voter, treasury };
  return _wallets;
}

// ─── Per-test multisig fixture ───────────────────────────────────────────────

export interface MultisigFixture {
  connection: Connection;
  creator: Keypair;
  members: Keypair[];
  multisigPda: PublicKey;
  vaultPda: PublicKey;
  createKey: Keypair;
}

/**
 * Creates a fresh multisig PDA for each test, reusing shared wallets.
 * No additional airdrop — relies on wallets funded by `initSuiteWallets`.
 */
export async function createFreshMultisig(
  wallets: SuiteWallets,
  threshold: number = 2
): Promise<MultisigFixture> {
  const { connection, creator, voter, treasury } = wallets;
  const { Permission, Permissions } = multisig.types;

  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  const sig = await multisig.rpc.multisigCreateV2({
    connection,
    treasury,
    createKey,
    creator,
    multisigPda,
    configAuthority: null,
    timeLock: 0,
    members: [
      { key: creator.publicKey, permissions: Permissions.all() },
      {
        key: voter.publicKey,
        permissions: Permissions.fromPermissions([Permission.Vote]),
      },
    ],
    threshold,
    rentCollector: null,
    sendOptions: { skipPreflight: false },
  });
  await connection.confirmTransaction(sig, COMMITMENT);

  return {
    connection,
    creator,
    members: [voter],
    multisigPda,
    vaultPda,
    createKey,
  };
}

// ─── Legacy helper (kept for offline / local-validator tests) ────────────────

export interface LegacyFixture extends MultisigFixture {}

/** @deprecated Use initSuiteWallets + createFreshMultisig on devnet. */
export async function createMultisigFixture(
  memberCount: number = 1,
  threshold: number = 2
): Promise<LegacyFixture> {
  const connection = getConnection();
  const creator = Keypair.generate();
  const extraMembers = Array.from({ length: memberCount }, () =>
    Keypair.generate()
  );

  await airdrop(connection, creator.publicKey, 5);
  for (const m of extraMembers) {
    await airdrop(connection, m.publicKey, 1);
  }

  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  const { Permission, Permissions } = multisig.types;
  const treasury = await getProgramTreasury(connection);

  await multisig.rpc.multisigCreateV2({
    connection,
    treasury,
    createKey,
    creator,
    multisigPda,
    configAuthority: null,
    timeLock: 0,
    members: [
      { key: creator.publicKey, permissions: Permissions.all() },
      ...extraMembers.map((m) => ({
        key: m.publicKey,
        permissions: Permissions.fromPermissions([Permission.Vote]),
      })),
    ],
    threshold,
    rentCollector: null,
    sendOptions: { skipPreflight: true },
  });

  return { connection, creator, members: extraMembers, multisigPda, vaultPda, createKey };
}

/** Send a Squads RPC call and confirm the transaction before returning. */
export async function confirm(
  connection: Connection,
  sig: string
): Promise<void> {
  await connection.confirmTransaction(sig, COMMITMENT);
}

export async function getNextTransactionIndex(
  connection: Connection,
  multisigPda: PublicKey
): Promise<bigint> {
  const msAccount = await multisig.accounts.Multisig.fromAccountAddress(
    connection,
    multisigPda
  );
  return BigInt(msAccount.transactionIndex.toString()) + 1n;
}
