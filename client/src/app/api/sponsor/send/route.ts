import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

function loadServerKeypair(): Keypair {
  const raw = process.env.SPONSOR_SECRET_KEY;
  if (!raw) throw new Error("SPONSOR_SECRET_KEY not configured");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

/**
 * POST /api/sponsor/send
 * Body: { transaction: string }  — base64-encoded, user-signed VersionedTransaction
 *
 * Server adds its signature (as fee payer) and broadcasts. The transaction must
 * already carry all required non-server signatures before reaching this endpoint.
 * Returns: { signature: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ") || !authHeader.slice(7)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transaction } = await req.json();
    const server = loadServerKeypair();

    const rpc =
      process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpc, "confirmed");

    const txBytes = Buffer.from(transaction, "base64");
    const tx = VersionedTransaction.deserialize(txBytes);

    // Add server signature (preserves any existing user signatures)
    tx.sign([server]);

    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });

    // Use blockhash from the tx itself for confirmation
    const { lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const result = await connection.confirmTransaction(
      { signature: sig, blockhash: tx.message.recentBlockhash, lastValidBlockHeight },
      "confirmed"
    );

    if (result.value.err) {
      throw new Error(JSON.stringify(result.value.err));
    }

    return NextResponse.json({ signature: sig });
  } catch (e) {
    console.error("[sponsor/send]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
