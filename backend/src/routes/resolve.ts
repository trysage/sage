import { Router, type Request, type Response, type IRouter } from "express";
import { getUserByUsername } from "../lib/supabase/index.js";

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function resolveSns(name: string): Promise<string | null> {
  const domain = name.replace(/\.sol$/i, "");
  try {
    const res = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${encodeURIComponent(domain)}`);
    if (!res.ok) return null;
    const data = await res.json() as { s: string; result?: string };
    return data.s === "ok" && data.result ? data.result : null;
  } catch {
    return null;
  }
}

export function createResolveRouter(): IRouter {
  const router = Router();

  /**
   * GET /resolve?name=<address|username|name.sol>
   *
   * Resolves:
   *   - base58 Solana address  → returned as-is
   *   - <name>.sol             → Bonfida SNS lookup
   *   - anything else          → Sage username lookup in user_details
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const name = (req.query.name as string | undefined)?.trim();
      if (!name) {
        res.status(400).json({ error: "Missing query param: name" });
        return;
      }

      // Pass through plain Solana addresses unchanged
      if (SOLANA_ADDR_RE.test(name)) {
        res.json({ address: name, source: "address" });
        return;
      }

      if (name.toLowerCase().endsWith(".sol")) {
        const address = await resolveSns(name);
        if (!address) {
          res.status(404).json({ error: `SNS name not found: ${name}` });
          return;
        }
        res.json({ address, name, source: "sns" });
        return;
      }

      // Sage username lookup
      const user = await getUserByUsername(name.toLowerCase());
      if (!user) {
        res.status(404).json({ error: `No Sage user found with username "${name}"` });
        return;
      }
      res.json({ address: user.vault_address, name: user.username, source: "sage" });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Resolve error" });
    }
  });

  return router;
}
