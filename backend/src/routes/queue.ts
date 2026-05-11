import { Router, type Request, type Response, type IRouter } from "express";
import { analyzeRisk } from "../risk.js";
import { notifyTelegram } from "../notify.js";
import {
  createProposal,
  updateProposal,
  getPatternsForSafe,
  getTelegramChatId,
  recordProposalOutcome,
  incrementDailyStatsReview,
} from "../lib/supabase/index.js";
import type { MultisigProposal } from "../types.js";

export function createQueueRouter(): IRouter {
  const router = Router();

  /**
   * POST /queue
   * Body: {
   *   multisigAddress, vaultAddress, proposalIndex (transactionIndex as number),
   *   to, amount, amountUSD?, tokenSymbol?, tokenAddress?, tokenIconUrl?,
   *   proposedBy, screeningDisabled?
   * }
   *
   * Stores the proposal in DB, runs risk analysis, and returns the verdict.
   * If APPROVE and screening is enabled → returns execute instruction for client to sign.
   * If REVIEW/BLOCK → marks in_review, sends Telegram notification.
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const {
        multisigAddress, vaultAddress, proposalIndex,
        to, amount, amountUSD,
        tokenSymbol, tokenAddress, tokenIconUrl,
        proposedBy, screeningDisabled,
      } = req.body ?? {};

      if (!multisigAddress || !vaultAddress || !to || !amount) {
        res.status(400).json({ error: "Missing required fields: multisigAddress, vaultAddress, to, amount" });
        return;
      }

      const proposal = await createProposal({
        multisig_address: multisigAddress,
        vault_address: vaultAddress,
        proposal_index: proposalIndex ?? null,
        to_address: to,
        amount,
        token_symbol: tokenSymbol ?? null,
        token_address: tokenAddress ?? null,
        token_icon_url: tokenIconUrl ?? null,
        proposed_by: proposedBy ?? null,
        executed_at: null,
        tx_signature: null,
        status: "active",
        risk_score: null,
        risk_verdict: null,
        risk_reasons: null,
        in_review: false,
        review_reason: null,
        reviewed_at: null,
        rejected: false,
        rejected_at: null,
        reject_reason: null,
        amount_usd: amountUSD ?? null,
        screening_disabled: screeningDisabled ?? false,
      });

      // No risk screening — queue only
      if (screeningDisabled) {
        res.json({ success: true, id: proposal.id });
        return;
      }

      // Run risk analysis
      let risk;
      try {
        const patterns = await getPatternsForSafe(vaultAddress);
        risk = analyzeRisk(
          { to, amount, amountUSD, token: tokenSymbol, tokenAddress },
          patterns
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Risk analysis failed:", msg);
        res.json({ success: true, id: proposal.id, riskError: msg });
        return;
      }

      await updateProposal(proposal.id, {
        risk_score: risk.riskScore,
        risk_verdict: risk.verdict,
        risk_reasons: risk.reasons,
      });

      const proposalWithRisk: MultisigProposal = {
        ...proposal,
        riskScore: risk.riskScore,
        riskVerdict: risk.verdict,
        riskReasons: risk.reasons,
      };

      const shortTo = `${to.slice(0, 6)}…${to.slice(-4)}`;
      const chatId  = await getTelegramChatId(vaultAddress);

      if (risk.verdict === "APPROVE") {
        recordProposalOutcome(proposalWithRisk, "auto_approved", {
          riskScore: risk.riskScore, riskVerdict: risk.verdict,
          riskReasons: risk.reasons, triggeredRules: risk.triggeredRules,
        }).catch((e) => console.error("recordProposalOutcome failed:", e));

        // Autonomous execution — server holds Permission.Execute
        const port = Number(process.env.PORT) || 3001;
        let execSignature: string | undefined;
        try {
          const execRes = await fetch(`http://localhost:${port}/execute`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.AGENT_SECRET ?? ""}`,
            },
            body: JSON.stringify({ proposalId: proposal.id }),
          });
          const execData = await execRes.json() as { signature?: string; status?: string; error?: string };
          if (execRes.ok && !execData.error) {
            execSignature = execData.signature;
          } else {
            console.error("[queue] execute failed:", execData.error);
          }
        } catch (e) {
          console.error("[queue] execute call failed:", e);
        }

        notifyTelegram(
          `✅ Auto-approved — ${proposal.id}\n` +
          `${amount} ${tokenSymbol ?? "SOL"} → ${shortTo}\n` +
          `Risk: ${risk.riskScore}/100 — ${risk.reasons.join(", ")}` +
          (execSignature ? `\nTX: ${execSignature}` : ""),
          undefined, undefined, chatId
        );

        res.json({ success: true, id: proposal.id, risk, autoApproved: true, signature: execSignature });
        return;
      }

      // REVIEW or BLOCK
      await updateProposal(proposal.id, {
        in_review: true,
        reviewed_at: new Date().toISOString(),
        review_reason: risk.reasons.join("; "),
        status: "active",
      });

      const outcome = risk.verdict === "REVIEW" ? "sent_for_review" : "auto_blocked";
      Promise.all([
        recordProposalOutcome(proposalWithRisk, outcome, {
          riskScore: risk.riskScore, riskVerdict: risk.verdict,
          riskReasons: risk.reasons, triggeredRules: risk.triggeredRules,
        }),
        incrementDailyStatsReview(vaultAddress),
      ]).catch((e) => console.error("recordProposalOutcome failed:", e));

      const reviewButtons = [
        [{ text: `✅ approve` }, { text: `❌ reject` }],
        [{ text: `🔎 deep-analyze` }],
      ];

      const emoji  = risk.verdict === "REVIEW" ? "🔍" : "🚫";
      const label  = risk.verdict === "REVIEW" ? "REVIEW NEEDED" : "BLOCKED";
      notifyTelegram(
        `${emoji} ${label} — ${proposal.id}\n` +
        `${amount} ${tokenSymbol ?? "SOL"} → ${shortTo}\n` +
        `Risk: ${risk.riskScore}/100\nReasons: ${risk.reasons.join(", ")}`,
        reviewButtons, proposal.id, chatId
      );

      res.json({ success: true, id: proposal.id, risk });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
