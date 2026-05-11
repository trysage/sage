# sage-server

Express API that powers the Sage dapp and the agent. It sponsors Squads multisig transactions, runs the risk engine that screens every pending proposal, auto-executes safe transfers (the server is a multisig member with `Permission.Execute`), and brokers Telegram notifications between the user and the Nanobot agent skill.

Stack: Express · TypeScript · Supabase · `@sqds/multisig` · Privy (JWT verification) · Zerion · GoPlus · Rugcheck · Telegram Bot API.

Route groups: `/sponsor` (fee-paid multisig creation + transaction submission), `/queue` (risk screening entry point), `/execute` (autonomous co-signing), `/analyze` (deep security analysis), `/status` `/rules` (policy config), `/transactions` `/portfolio` `/tokens` `/events` (read APIs), `/telegram-webhook` `/bot-ping` `/notify-resolve` (Telegram glue).

## Getting started

From the repo root:

```bash
pnpm install
cp backend/.env.example backend/.env             # fill in the secrets
pnpm dev:server                                  # http://localhost:3001
```

Apply the schema to Supabase once (`backend/schema.sql`) and seed the sponsor keypair before first run:

```
SPONSOR_SECRET_KEY=[ ... JSON byte array of the server's Solana Keypair ... ]
```

Required env vars (`backend/.env`):

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PRIVY_APP_ID=
PRIVY_JWT_VERIFICATION_KEY=        # full JWK JSON from the Privy dashboard
ZERION_API_KEY=
AGENT_SECRET=                      # shared bearer token for agent + server-to-server
SPONSOR_SECRET_KEY=                # JSON byte array — the server's Solana keypair
SOLANA_RPC_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=           # optional
PORT=3001
```

Production: `pnpm --filter sage-server build && pnpm --filter sage-server start` (or `pm2 start ecosystem.config.cjs`).
