import { Router, type Request, type Response } from "express";
import { fetchTokenDetails, fetchSinglePeriodChart, type ChartPeriod } from "../lib/zerion.js";

const VALID_PERIODS = new Set<ChartPeriod>(["day", "week", "month", "year", "max"]);

export function createTokensRouter(): Router {
  const router = Router();

  /** GET /tokens/:tokenId — fungible details + market data */
  router.get("/:tokenId", async (req: Request, res: Response) => {
    const { tokenId } = req.params;
    if (!tokenId) {
      res.status(400).json({ error: "Missing tokenId" });
      return;
    }
    try {
      const detail = await fetchTokenDetails(tokenId);
      if (!detail) {
        res.status(404).json({ error: "Token not found" });
        return;
      }
      res.json(detail);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  /** GET /tokens/:tokenId/chart?period=day — price chart for a period */
  router.get("/:tokenId/chart", async (req: Request, res: Response) => {
    const { tokenId } = req.params;
    const period = (req.query.period as string) ?? "day";
    if (!VALID_PERIODS.has(period as ChartPeriod)) {
      res.status(400).json({ error: `Invalid period. Use: ${[...VALID_PERIODS].join(", ")}` });
      return;
    }
    try {
      const chart = await fetchSinglePeriodChart(tokenId, period as ChartPeriod, "usd", {
        headers: {
          accept: "application/json",
          authorization: `Basic ${process.env.ZERION_API_KEY ?? ""}`,
        },
      });
      if (!chart) {
        res.status(404).json({ error: "Chart data unavailable" });
        return;
      }
      res.json(chart);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  return router;
}
