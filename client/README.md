# sage-client

Next.js 15 dapp for Sage. The user signs in with Privy, sees their Squads vault portfolio (balances, tokens, activity), and sends transfers. Every transfer is fee-sponsored by the Sage server and registered with the risk engine — so the user never needs SOL for rent or fees, and every outgoing transaction is screened before it lands on-chain.

Stack: Next.js 15 (App Router) · React 18 · Privy (auth + embedded Solana wallet) · `@sqds/multisig` · Tailwind CSS · Framer Motion.

## Getting started

From the repo root:

```bash
pnpm install
cp client/.env.local.example client/.env.local   # if present, otherwise create it
pnpm dev:client                                  # http://localhost:3000
```

Required env vars (`client/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SPONSOR_PUBKEY=<server keypair public address>
NEXT_PUBLIC_PRIVY_APP_ID=<from privy dashboard>
NEXT_PUBLIC_SOLANA_RPC_URL=<your rpc url>
```

The client expects the backend to be running at `NEXT_PUBLIC_API_URL` — start it with `pnpm dev:server` in a second terminal.
