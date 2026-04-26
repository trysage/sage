import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

function loadServerKeypair(): Keypair {
  const raw = process.env.SPONSOR_SECRET_KEY;
  if (!raw) throw new Error("SPONSOR_SECRET_KEY not configured");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

/**
 * Derives a deterministic createKey for a given user pubkey using
 * HMAC-SHA256 keyed on the server secret. Same user → same createKey →
 * same multisig PDA, regardless of device or localStorage state.
 */
function deriveCreateKey(userPubkey: string): Keypair {
  const secret = process.env.SPONSOR_SECRET_KEY;
  if (!secret) throw new Error("SPONSOR_SECRET_KEY not configured");
  const seed = createHmac("sha256", secret)
    .update(`sage_multisig_v1:${userPubkey}`)
    .digest(); // 32-byte Buffer — valid Keypair seed
  return Keypair.fromSeed(new Uint8Array(seed));
}

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
 * POST /api/sponsor/create
 * Body: { userPubkey: string }
 *
 * Returns the deterministic multisig + vault PDAs for this user.
 * If the multisig already exists on-chain (e.g. user cleared storage or
 * logged in on a new device), skips creation and returns the existing PDAs.
 * Server is the Squads creator so no SOL is required from the user.
 */
export async function POST(req: NextRequest) {
  try {
    const { userPubkey } = await req.json();
    const user = new PublicKey(userPubkey);
    const server = loadServerKeypair();
    const createKey = deriveCreateKey(userPubkey);

    const rpc =
      process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpc, "confirmed");

    const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
    const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

    // If the multisig already exists on-chain, return it without creating.
    try {
      await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
      return NextResponse.json({ multisigPda: multisigPda.toBase58(), vaultPda: vaultPda.toBase58() });
    } catch {
      // Account doesn't exist yet — proceed with creation.
    }

    const treasury = await resolveTreasury(connection);

    const ix = multisig.instructions.multisigCreateV2({
      treasury,
      creator: server.publicKey,
      multisigPda,
      configAuthority: null,
      threshold: 1,
      members: [{ key: user, permissions: multisig.types.Permissions.all() }],
      timeLock: 0,
      createKey: createKey.publicKey,
      rentCollector: server.publicKey, // server reclaims rent from closed tx/proposal accounts
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const message = new TransactionMessage({
      payerKey: server.publicKey,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([server, createKey]);

    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    const result = await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    if (result.value.err) {
      throw new Error(JSON.stringify(result.value.err));
    }

    return NextResponse.json({
      multisigPda: multisigPda.toBase58(),
      vaultPda: vaultPda.toBase58(),
      signature: sig,
    });
  } catch (e) {
    console.error("[sponsor/create]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
