import { Router, type Request, type Response, type IRouter } from "express";
import {
  getUserRules,
  createUserRule,
  updateUserRule,
  deleteUserRule,
} from "../lib/supabase/index.js";

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const VALID_RULE_TYPES = [
  "amount_limit", "recipient_block", "recipient_whitelist",
  "time_restriction", "velocity_limit", "token_restriction", "custom",
] as const;

const VALID_ACTIONS = ["approve", "review", "block"] as const;

export function createRulesRouter(): IRouter {
  const router = Router();

  /** GET /rules?vault=<base58> — returns all active rules sorted by priority */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const vault = req.query.vault as string | undefined;
      if (!vault || !SOLANA_ADDR_RE.test(vault)) {
        res.status(400).json({ error: "Missing or invalid vault address" });
        return;
      }
      const rules = await getUserRules(vault);
      res.json({ rules });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  /** POST /rules — create a new rule for a vault */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const {
        vault, name, ruleType, conditions, action,
        riskScoreDelta = 0, priority = 100, description,
      } = req.body ?? {};

      if (!vault || !SOLANA_ADDR_RE.test(vault)) {
        res.status(400).json({ error: "Missing or invalid vault address" });
        return;
      }
      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Missing required field: name" });
        return;
      }
      if (!VALID_RULE_TYPES.includes(ruleType)) {
        res.status(400).json({ error: `Invalid ruleType. Must be one of: ${VALID_RULE_TYPES.join(", ")}` });
        return;
      }
      if (!VALID_ACTIONS.includes(action)) {
        res.status(400).json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` });
        return;
      }
      if (conditions === undefined || typeof conditions !== "object") {
        res.status(400).json({ error: "conditions must be a JSON object" });
        return;
      }

      const rule = await createUserRule(vault, {
        name,
        description: description ?? null,
        rule_type: ruleType,
        conditions,
        action,
        risk_score_delta: Number(riskScoreDelta),
        priority: Number(priority),
        is_active: true,
      });

      res.status(201).json({ rule });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  /** PATCH /rules/:id — update any mutable field on a rule */
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, ruleType, conditions, action, riskScoreDelta, priority, description, isActive } = req.body ?? {};

      if (!id) { res.status(400).json({ error: "Missing rule id" }); return; }

      const patch: Parameters<typeof updateUserRule>[1] = {};
      if (name !== undefined)           patch.name             = name;
      if (description !== undefined)    patch.description      = description;
      if (conditions !== undefined)     patch.conditions       = conditions;
      if (riskScoreDelta !== undefined) patch.risk_score_delta = Number(riskScoreDelta);
      if (priority !== undefined)       patch.priority         = Number(priority);
      if (isActive !== undefined)       patch.is_active        = Boolean(isActive);

      if (ruleType !== undefined) {
        if (!VALID_RULE_TYPES.includes(ruleType)) { res.status(400).json({ error: "Invalid ruleType" }); return; }
        patch.rule_type = ruleType;
      }
      if (action !== undefined) {
        if (!VALID_ACTIONS.includes(action)) { res.status(400).json({ error: "Invalid action" }); return; }
        patch.action = action;
      }

      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      await updateUserRule(id, patch);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  /** DELETE /rules/:id — soft-delete (sets is_active = false) */
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) { res.status(400).json({ error: "Missing rule id" }); return; }
      await deleteUserRule(id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  return router;
}
