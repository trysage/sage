import { Router, type Request, type Response, type IRouter } from "express";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import {
  getProposal,
  getLastInReviewProposal,
  updateProposal,
  updatePatternsAfterExecution,
  recordProposalOutcome,
} from "../lib/supabase/index.js";

function getConnection(): Connection {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

function loadSponsorKeypair(): Keypair {
  const raw = process.env.SPONSOR_SECRET_KEY;
  if (!raw) throw new Error("SPONSOR_SECRET_KEY not configured");
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}

export function createExecuteRouter(): IRouter {
  const router = Router();

  /**
   * POST /execute
   * Body: { proposalId?, vaultAddress? }
   *
   * The server (which holds Execute permission on the multisig) builds,
   * signs, and broadcasts vaultTransactionExecute autonomously — no client
   * wallet signature required. This is possible because sponsor/create adds
   * the server keypair as a member with Permission.Execute.
   *
   * If proposalId is omitted, resolves to the latest in-review proposal
   * for the given vaultAddress.
   *
   * Returns { status: "executed", signature } on success.
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { proposalId, vaultAddress, multisigPda: multisigPdaStr, transactionIndex: txIndexStr } = req.body ?? {};

      const server     = loadSponsorKeypair();
      const connection = getConnection();

      let multisigPda: PublicKey;
      let txIndex: bigint;
      let proposalDbId: string | null = null;

      // Path A: raw on-chain params (called directly from client after propose)
      if (multisigPdaStr && txIndexStr !== undefined) {
        multisigPda = new PublicKey(multisigPdaStr);
        txIndex     = BigInt(txIndexStr);
      } else {
        // Path B: resolve via DB proposal
        let proposal;
        if (proposalId) {
          proposal = await getProposal(proposalId);
          if (!proposal) {
            res.status(404).json({ error: `Proposal not found: ${proposalId}` });
            return;
          }
        } else {
          if (!vaultAddress) {
            res.status(400).json({ error: "Provide multisigPda+transactionIndex, proposalId, or vaultAddress" });
            return;
          }
          proposal = await getLastInReviewProposal(vaultAddress);
          if (!proposal) {
            res.status(404).json({ error: "No in-review proposal found for this vault" });
            return;
          }
        }

        if (proposal.rejected) { res.json({ status: "already_rejected" }); return; }
        if (proposal.executedAt) { res.json({ status: "already_executed", signature: proposal.txSignature }); return; }
        if (proposal.proposalIndex === null) {
          res.status(400).json({ error: "Proposal has no on-chain transactionIndex" });
          return;
        }

        multisigPda  = new PublicKey(proposal.multisigAddress);
        txIndex      = BigInt(proposal.proposalIndex);
        proposalDbId = proposal.id;
      }

      // Server is the executing member (has Permission.Execute on the multisig)
      const { instruction, lookupTableAccounts } =
        await multisig.instructions.vaultTransactionExecute({
          connection,
          multisigPda,
          transactionIndex: txIndex,
          member: server.publicKey,
        });

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      const message = new TransactionMessage({
        payerKey: server.publicKey,
        recentBlockhash: blockhash,
        instructions: [
          ComputeBudgetProgram.requestHeapFrame({ bytes: 262144 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
          instruction,
        ],
      }).compileToV0Message(lookupTableAccounts);

      const tx = new VersionedTransaction(message);
      // Server signs as both fee payer and executing member
      tx.sign([server]);

      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
      });
      const result = await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      if (result.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
      }

      // Update DB proposal if we have one
      if (proposalDbId) {
        const proposal = await getProposal(proposalDbId);
        if (proposal) {
          await updateProposal(proposalDbId, {
            status: "executed",
            executed_at: new Date().toISOString(),
            tx_signature: sig,
            in_review: false,
          });
          const executed = { ...proposal, txSignature: sig, executedAt: new Date().toISOString() };
          Promise.all([
            updatePatternsAfterExecution(executed),
            recordProposalOutcome(executed, "executed", {
              riskScore:   proposal.riskScore   ?? undefined,
              riskVerdict: proposal.riskVerdict ?? undefined,
              riskReasons: proposal.riskReasons ?? undefined,
            }),
          ]).catch((e) => console.error("[execute] pattern update failed:", e));
        }
      }

      // Fire-and-forget: reclaim rent from vault tx + proposal accounts
      const port = Number(process.env.PORT) || 3001;
      fetch(`http://localhost:${port}/sponsor/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AGENT_SECRET ?? ""}`,
        },
        body: JSON.stringify({
          multisigPda: multisigPda.toBase58(),
          transactionIndex: txIndex.toString(),
        }),
      }).catch((e) => console.warn("[execute] rent reclaim failed:", e));

      res.json({
        status: "executed",
        proposalId: proposalDbId,
        signature: sig,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const logs = err instanceof SendTransactionError ? err.logs : undefined;
      console.error("[execute]", message, logs);
      res.status(500).json({ error: message, logs });
    }
  });

  return router;
}
