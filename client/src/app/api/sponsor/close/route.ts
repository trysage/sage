import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
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
 * POST /api/sponsor/close
 * Body: { multisigPda: string, transactionIndex: string }
 *
 * Closes the vault transaction and proposal accounts for a completed
 * transaction, recovering rent back to the server (rentCollector).
 * Permissionless — no user signature required.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { multisigPda: multisigPdaStr, transactionIndex: txIndexStr } = body;
    console.log("[sponsor/close] request:", { multisigPda: multisigPdaStr, transactionIndex: txIndexStr });

    const multisigPda = new PublicKey(multisigPdaStr);
    const transactionIndex = BigInt(txIndexStr);
    const server = loadServerKeypair();
    console.log("[sponsor/close] server pubkey:", server.publicKey.toBase58());

    const rpc =
      process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpc, "confirmed");

    // Fetch the multisig to get the current rentCollector
    console.log("[sponsor/close] fetching multisig account...");
    const msAccount = await multisig.accounts.Multisig.fromAccountAddress(
      connection,
      multisigPda
    );
    const rentCollector = msAccount.rentCollector;
    console.log("[sponsor/close] rentCollector:", rentCollector?.toBase58() ?? "null");

    if (!rentCollector) {
      console.error("[sponsor/close] multisig has no rentCollector set");
      return NextResponse.json({ error: "No rentCollector set on multisig" }, { status: 400 });
    }

    console.log("[sponsor/close] building vaultTransactionAccountsClose ix, txIndex:", transactionIndex.toString());
    const ix = multisig.instructions.vaultTransactionAccountsClose({
      multisigPda,
      rentCollector,
      transactionIndex,
    });

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const message = new TransactionMessage({
      payerKey: server.publicKey,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([server]);

    console.log("[sponsor/close] sending transaction...");
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    console.log("[sponsor/close] confirming:", sig);
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    console.log("[sponsor/close] confirmed, rent reclaimed:", sig);
    return NextResponse.json({ signature: sig });
  } catch (e) {
    console.error("[sponsor/close] failed:", e instanceof Error ? e.message : String(e));
    if (e instanceof Error && e.stack) console.error(e.stack);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
