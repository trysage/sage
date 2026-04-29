import { Router, type Request, type Response } from "express";
import { getPortfolioForAddress } from "../lib/zerion.js";

// Solana base58 address: 32–44 chars from the base58 alphabet
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function createPortfolioRouter(): Router {
  const router = Router();

  /**
   * GET /portfolio?address=<solana-pubkey>
   *
   * Returns Solana token positions and 24h portfolio change for the given wallet.
   * Public — no auth required (address is not sensitive).
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const address = (req.query.address ?? req.query.vaultAddress) as string | undefined;
      if (!address || !SOLANA_ADDRESS_RE.test(address)) {
        res.status(400).json({ error: "Missing or invalid Solana address (query: address or vaultAddress)" });
        return;
      }
      const portfolio = await getPortfolioForAddress(address);
      res.json(portfolio);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Portfolio error:", message);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
