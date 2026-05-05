import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import { verifyPrivyToken } from "./lib/privy.js";
import { getUserBySignerAddress } from "./lib/supabase/index.js";
import type { UserDetailsRow } from "./lib/supabase/types.js";
import { createPortfolioRouter } from "./routes/portfolio.js";
import { createTransactionsRouter } from "./routes/transactions.js";
import { createUsersRouter } from "./routes/users.js";
import { createTokensRouter } from "./routes/tokens.js";

const app = express();

const AGENT_SECRET = process.env.AGENT_SECRET;

declare global {
  namespace Express {
    interface Request {
      callerId?: string;
      /**
       * Populated for authenticated client calls (Privy token).
       * Contains the user_details row resolved via the Solana signer address.
       * Undefined for agent calls or when the user hasn't completed onboarding.
       */
      user?: UserDetailsRow;
    }
  }
}

async function auth(req: Request, res: Response, next: NextFunction) {
  const bearer = req.headers["authorization"]?.replace("Bearer ", "");
  if (!bearer) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Agent / server-to-server call — simple secret comparison
  if (bearer === AGENT_SECRET) {
    req.callerId = req.body?.callerId ?? (req.query.callerId as string) ?? undefined;
    return next();
  }

  // Client call — verify as Privy identity token
  try {
    const { userId, walletAddress } = await verifyPrivyToken(bearer);
    req.callerId = `privy:${userId}`;

    // if (walletAddress) {
    //   const user = await getUserBySignerAddress(walletAddress);
    //   if (user) req.user = user;
    // }

    return next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public routes — no auth
app.use("/portfolio", auth, createPortfolioRouter());
app.use("/tokens", auth, createTokensRouter());

// Authenticated routes (auth is a no-op when AGENT_SECRET is unset)
app.use("/transactions", auth, createTransactionsRouter());
app.use("/users", auth, createUsersRouter());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sage-server" });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Sage server listening on http://localhost:${port}`);
});
