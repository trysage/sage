import { Router, type Request, type Response } from "express";
import { getUserByVaultAddress, upsertUser } from "../lib/supabase/index.js";

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function createUsersRouter(): Router {
  const router = Router();

  /**
   * GET /users?vaultAddress=<pubkey>
   *
   * Returns the user profile for the given vault address.
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const vaultAddress = (req.query.vaultAddress ?? req.user?.vault_address) as string | undefined;
      if (!vaultAddress || !SOLANA_ADDRESS_RE.test(vaultAddress)) {
        res.status(400).json({ error: "Missing or invalid vaultAddress" });
        return;
      }
      const user = await getUserByVaultAddress(vaultAddress);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /users — upsert user record (called on login / onboarding)
   *
   * Body: { vaultAddress, multisigAddress?, signerAddress?, name?, email?, telegramId? }
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { vaultAddress, multisigAddress, signerAddress, name, email, telegramId } = req.body ?? {};
      if (!vaultAddress || !SOLANA_ADDRESS_RE.test(vaultAddress)) {
        res.status(400).json({ error: "Missing or invalid vaultAddress" });
        return;
      }
      const user = await upsertUser(vaultAddress, {
        multisig_address: multisigAddress ?? null,
        signer_address: signerAddress ?? null,
        name: name ?? null,
        email: email ?? null,
        ...(telegramId !== undefined ? { telegram_chat_id: telegramId || null } : {}),
      });
      res.json({ user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
