import { Router, type Request, type Response, type IRouter } from "express";
import { getBehavioralEvents } from "../lib/supabase/index.js";

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function createEventsRouter(): IRouter {
  const router = Router();

  /**
   * GET /events?vault=<base58>&limit=<n>
   * Returns the behavioral event log for a vault, newest first.
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const vault = req.query.vault as string | undefined;
      const limit = Math.min(Number(req.query.limit ?? 100), 500);

      if (!vault || !SOLANA_ADDR_RE.test(vault)) {
        res.status(400).json({ error: "Missing or invalid vault address" });
        return;
      }

      const events = await getBehavioralEvents(vault, limit);
      res.json({ events });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  return router;
}
