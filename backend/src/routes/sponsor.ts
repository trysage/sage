import { createHmac } from "crypto";
import { Router, type Request, type Response, type IRouter } from "express";
import {
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

function getConnection(): Connection {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

function loadSponsorKeypair(): Keypair {
  const raw = process.env.SPONSOR_SECRET_KEY;
  if (!raw) throw new Error("SPONSOR_SECRET_KEY not configured");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

/**
 * Derives a deterministic createKey for a given user pubkey using
 * HMAC-SHA256 keyed on the sponsor secret. Same user → same createKey →
 * same multisig PDA, regardless of device or session state.
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

export function createSponsorRouter(): IRouter {
  const router = Router();

  /**
   * POST /sponsor/create
   * Body: { userPubkey: string }
   *
   * Returns the deterministic multisig + vault PDAs for this user.
   * If the multisig already exists on-chain (e.g. user cleared storage or
   * logged in on a new device), skips creation and returns existing PDAs.
   * Server pays all account rent — no SOL required from the user.
   */
  router.post("/create", async (req: Request, res: Response) => {
    try {
      const { userPubkey } = req.body ?? {};
      if (!userPubkey || typeof userPubkey !== "string") {
        res.status(400).json({ error: "Missing required field: userPubkey" });
        return;
      }

      let user: PublicKey;
      try {
        user = new PublicKey(userPubkey);
      } catch {
        res.status(400).json({ error: "Invalid userPubkey" });
        return;
      }

      const server = loadSponsorKeypair();
      const createKey = deriveCreateKey(userPubkey);
      const connection = getConnection();

      const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
      const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

      // If the multisig already exists, return it without re-creating.
      try {
        await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
        res.json({
          multisigPda: multisigPda.toBase58(),
          vaultPda: vaultPda.toBase58(),
        });
        return;
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
        members: [
          { key: user,             permissions: multisig.types.Permissions.all() },
          { key: server.publicKey, permissions: multisig.types.Permissions.fromPermissions([multisig.types.Permission.Execute]) },
        ],
        timeLock: 0,
        createKey: createKey.publicKey,
        rentCollector: server.publicKey,
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

      if (result.value.err) throw new Error(JSON.stringify(result.value.err));

      res.json({
        multisigPda: multisigPda.toBase58(),
        vaultPda: vaultPda.toBase58(),
        signature: sig,
      });
    } catch (err) {
      console.error("[sponsor/create]", err);
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  /**
   * POST /sponsor/send
   * Body: { transaction: string }  — base64-encoded, user-signed VersionedTransaction
   *
   * Server adds its signature as fee payer and broadcasts. The transaction must
   * already carry all required non-server signatures before reaching this endpoint.
   * Returns: { signature: string }
   */
  router.post("/send", async (req: Request, res: Response) => {
    try {
      const { transaction } = req.body ?? {};
      if (!transaction || typeof transaction !== "string") {
        res.status(400).json({ error: "Missing required field: transaction (base64)" });
        return;
      }

      const server = loadSponsorKeypair();
      const connection = getConnection();

      // Fail fast if the sponsor wallet is critically low on SOL
      const sponsorBalance = await connection.getBalance(server.publicKey);
      const MIN_SPONSOR_BALANCE = 0.05 * 1e9; // 0.05 SOL
      if (sponsorBalance < MIN_SPONSOR_BALANCE) {
        res.status(503).json({
          error: `Sponsor wallet low on SOL (${(sponsorBalance / 1e9).toFixed(4)} SOL). Please contact support.`,
        });
        return;
      }

      const txBytes = Buffer.from(transaction, "base64");
      const tx = VersionedTransaction.deserialize(txBytes);

      // Add server signature — preserves any existing user signatures
      tx.sign([server]);

      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
      });

      const { lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const result = await connection.confirmTransaction(
        { signature: sig, blockhash: tx.message.recentBlockhash, lastValidBlockHeight },
        "confirmed"
      );

      if (result.value.err) throw new Error(JSON.stringify(result.value.err));

      res.json({ signature: sig });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const logs = err instanceof SendTransactionError ? err.logs : undefined;
      console.error("[sponsor/send]", message, logs);
      res.status(500).json({ error: message, logs });
    }
  });

  /**
   * POST /sponsor/close
   * Body: { multisigPda: string, transactionIndex: string }
   *
   * Closes the vault transaction and proposal accounts for a completed
   * transaction, recovering rent back to the server (rentCollector).
   * Permissionless on-chain — no user signature required.
   * Returns: { signature: string }
   */
  router.post("/close", async (req: Request, res: Response) => {
    try {
      const { multisigPda: multisigPdaStr, transactionIndex: txIndexStr } = req.body ?? {};
      if (!multisigPdaStr || !txIndexStr) {
        res.status(400).json({ error: "Missing required fields: multisigPda, transactionIndex" });
        return;
      }

      let multisigPdaKey: PublicKey;
      let transactionIndex: bigint;
      try {
        multisigPdaKey = new PublicKey(multisigPdaStr);
        transactionIndex = BigInt(txIndexStr);
      } catch {
        res.status(400).json({ error: "Invalid multisigPda or transactionIndex" });
        return;
      }

      const server = loadSponsorKeypair();
      const connection = getConnection();

      const msAccount = await multisig.accounts.Multisig.fromAccountAddress(
        connection,
        multisigPdaKey
      );

      if (!msAccount.rentCollector) {
        res.status(400).json({ error: "No rentCollector set on multisig" });
        return;
      }

      const ix = multisig.instructions.vaultTransactionAccountsClose({
        multisigPda: multisigPdaKey,
        rentCollector: msAccount.rentCollector,
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

      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
      });
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      res.json({ signature: sig });
    } catch (err) {
      console.error("[sponsor/close]", err);
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
