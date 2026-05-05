import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import { verifyPrivyToken } from "./lib/privy.js";
import { getUserBySignerAddress, getUserByTelegramId, markBotConnectedByChatId } from "./lib/supabase/index.js";
import type { UserDetailsRow } from "./lib/supabase/types.js";
import { createPortfolioRouter } from "./routes/portfolio.js";
import { createSponsorRouter } from "./routes/sponsor.js";
import { createTransactionsRouter } from "./routes/transactions.js";
import { createQueueRouter } from "./routes/queue.js";
import { createExecuteRouter } from "./routes/execute.js";
import { createStatusRouter, getTelegramChatIdForVault } from "./routes/status.js";
import { createRulesRouter } from "./routes/rules.js";
import { createResolveRouter } from "./routes/resolve.js";
import { createAnalyzeRouter } from "./routes/analyze.js";
import { createEventsRouter } from "./routes/events.js";
import { createUsersRouter } from "./routes/users.js";
import { createTokensRouter } from "./routes/tokens.js";
import { editNotification } from "./notify.js";

const app = express();
const AGENT_SECRET = process.env.AGENT_SECRET;

declare global {
  namespace Express {
    interface Request {
      callerId?: string;
      user?: UserDetailsRow;
    }
  }
}

async function auth(req: Request, res: Response, next: NextFunction) {
  if (!AGENT_SECRET) return next();

  const bearer = req.headers["authorization"]?.replace("Bearer ", "");
  if (!bearer) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (bearer === AGENT_SECRET) {
    req.callerId = req.body?.callerId ?? (req.query.callerId as string) ?? undefined;
    return next();
  }

  try {
    const { userId, walletAddress } = await verifyPrivyToken(bearer);
    req.callerId = `privy:${userId}`;
    if (walletAddress) {
      const user = await getUserBySignerAddress(walletAddress);
      if (user) req.user = user;
    }
    return next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Public routes ─────────────────────────────────────────────────────────────
app.use("/portfolio", createPortfolioRouter());
app.use("/tokens",    createTokensRouter());
app.use("/events",    createEventsRouter());

// ── Authenticated routes ──────────────────────────────────────────────────────
app.use("/sponsor",      auth, createSponsorRouter());
app.use("/transactions", auth, createTransactionsRouter());
app.use("/queue",        auth, createQueueRouter());
app.use("/execute",      auth, createExecuteRouter());
app.use("/status",       auth, createStatusRouter());
app.use("/rules",        auth, createRulesRouter());
app.use("/resolve",      auth, createResolveRouter());
app.use("/analyze",      auth, createAnalyzeRouter());
app.use("/users",        auth, createUsersRouter());

// ── Telegram / bot endpoints ──────────────────────────────────────────────────

/** POST /notify-resolve — update an existing Telegram notification after approve/reject */
app.post("/notify-resolve", auth, async (req, res) => {
  const { proposalId, action, txSignature, vaultAddress } = req.body ?? {};
  if (!proposalId || !action) {
    res.status(400).json({ error: "Missing proposalId or action" });
    return;
  }

  let message: string;
  if (action === "approved") {
    message = `✅ Approved — ${proposalId}`;
    if (txSignature) message += `\nTX: ${txSignature}`;
  } else if (action === "rejected") {
    message = `❌ Rejected — ${proposalId}`;
  } else {
    message = `${action} — ${proposalId}`;
  }

  let chatId: string | undefined;
  try {
    if (vaultAddress) chatId = await getTelegramChatIdForVault(vaultAddress);
  } catch { /* ignore */ }

  editNotification(proposalId, message, chatId);
  res.json({ ok: true });
});

/** POST /bot-ping — called by the agent on Telegram /start */
app.post("/bot-ping", async (req, res) => {
  const chatId = String(req.body?.chatId ?? "");
  if (!chatId) {
    res.status(400).json({ error: "Missing chatId" });
    return;
  }
  try {
    const [user] = await Promise.all([
      getUserByTelegramId(chatId),
      markBotConnectedByChatId(chatId),
    ]);
    if (!user) {
      res.json({ ok: true, found: false });
      return;
    }
    res.json({
      ok: true, found: true,
      vaultAddress: user.vault_address,
      name: user.name,
      username: user.username,
    });
  } catch (err) {
    console.error("bot-ping failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

/** GET /me?chatId=<telegramChatId> — fetch user profile by Telegram chat ID */
app.get("/me", auth, async (req, res) => {
  const chatId = String(req.query.chatId ?? "");
  if (!chatId) {
    res.status(400).json({ error: "Missing chatId" });
    return;
  }
  try {
    const user = await getUserByTelegramId(chatId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      vaultAddress:  user.vault_address,
      signerAddress: user.signer_address,
      name:          user.name,
      username:      user.username,
      email:         user.email,
    });
  } catch (err) {
    console.error("GET /me failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

/** POST /telegram-webhook — called by Telegram on any user message */
app.post("/telegram-webhook", async (req, res) => {
  const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (WEBHOOK_SECRET) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== WEBHOOK_SECRET) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  const chatId = String(
    req.body?.message?.chat?.id ?? req.body?.callback_query?.from?.id ?? ""
  );
  if (chatId && chatId !== "undefined") {
    markBotConnectedByChatId(chatId).catch((e) =>
      console.error("telegram-webhook: markBotConnected failed:", e)
    );
  }
  res.json({ ok: true });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sage-server" });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Sage server listening on http://localhost:${port}`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[db] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — DB calls will fail");
    return;
  }
  fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  })
    .then((r) => {
      if (r.ok) console.log("[db] Supabase connection OK");
      else console.error(`[db] Supabase connection failed: HTTP ${r.status}`);
    })
    .catch((e: Error) => console.error("[db] Supabase connection failed:", e.message));
});
