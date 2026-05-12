<div align="center">

# Sage

**AI co-signer and onchain security agent for Squads Protocol V4 multisigs on Solana.**

Sage acts as an autonomous second signer on your Squads vault. It learns how the vault transacts — amounts, recipients, tokens, timing — and screens every pending proposal against that behavioral profile, configurable policy rules, and external security data (GoPlus, Rugcheck, Zerion). Safe transactions auto-execute. Borderline ones are surfaced over Telegram for one-tap review. Clearly malicious ones are blocked.

[trysage.xyz](https://heysage.me) · [Docs](https://docs.heysage.me) · [Brand kit](https://www.heysage.me/brandkit)

</div>

---

## Structure

```
client/      Next.js 15 dapp — wallet, vault, send/receive, queue, settings
backend/     Express API — sponsor, queue, risk engine, execute, telegram
agents/      Nanobot skill pack — conversational layer over the Sage API
site/        Marketing site + brand kit (Next.js 15)
src/         Squads SDK wrappers (core helpers — createMultisig, PDAs, state)
tests/       Mocha test suites — multisig, proposal lifecycle, config, reference flow
brandkit/    Brand assets — design system, logo system, playground
```

## Architecture

```
       ┌────────────────────┐                                          ┌─────────────────┐
       │ Client (Next.js)   │  ── sponsored propose + approve ───────▶ │                 │ ─▶ Solana
       │ Privy · Squads SDK │                                          │  Server         │    Squads V4
       │                    │  ◀───────── POST /queue ──────────────── │  (Express)      │
       └────────────────────┘                                          │                 │ ─▶ Supabase
                                                                       │  • risk engine  │    (patterns, rules,
                                                                       │  • policy rules │     events, audit)
       ┌────────────────────┐  ── Telegram: REVIEW / BLOCK ─────────── │  • execute      │
       │ Agent (Nanobot)    │     buttons: ✅ ❌ 🔎                    │  • telegram bot │ ─▶ Zerion · GoPlus
       │ + Security MCP     │  ── curl /execute /analyze /rules ─────▶ │                 │    Rugcheck
       └────────────────────┘                                          └─────────────────┘
```

**Flow.** The user proposes a transfer in the client. The server fee-pays a sponsored `vaultTransactionCreate + proposalCreate + proposalApprove` (the user signs as member via Privy), then the client registers the proposal with `POST /queue`. The risk engine scores it against the vault's learned behavior + policy rules + external sources and returns one of three verdicts:

- **APPROVE** — server self-calls `/execute`, signs `vaultTransactionExecute` with its own member key (it holds `Permission.Execute`), broadcasts, and sends a confirmation to Telegram.
- **REVIEW / BLOCK** — proposal is marked `in_review` and a Telegram message with ✅ approve / ❌ reject / 🔎 deep-analyze buttons is sent to the owner.

Telegram button taps are routed by **Nanobot** to the Sage skill pack (`agents/`), which calls the Sage API with `AGENT_SECRET`. The agent also has access to security tools over **MCP** (GoPlus, Rugcheck, address intelligence) for ad-hoc analysis. The agent layer is conversational only — every deterministic decision lives on the server.

## Getting started

**Prerequisites:** Node ≥ 20, pnpm 10, a Solana RPC, a Supabase project, a Privy app, and a Telegram bot.

```bash
git clone https://github.com/consensolabs/sage
cd sage
pnpm install
```

Copy the env templates and fill in the secrets:

```bash
cp backend/.env.example backend/.env
cp client/.env.local.example client/.env.local   # if present
```

Run the apps (each in its own terminal):

```bash
pnpm dev:server    # backend on http://localhost:3001
pnpm dev:client    # dapp     on http://localhost:3000
pnpm dev:site      # marketing on http://localhost:3001 (optional)
```

See the per-package READMEs for what each piece does and the env vars it expects:

- [`client/README.md`](./client/README.md)
- [`backend/README.md`](./backend/README.md)
- [`agents/README.md`](./agents/README.md)

## Tests

The Squads SDK helpers in `src/` are covered by a Mocha suite under `tests/`:

```bash
pnpm test                              # all suites (needs a local validator)
pnpm test:reference                    # the canonical 2-of-2 agentic co-signer flow
RPC_URL=https://api.devnet.solana.com pnpm test:reference   # against devnet
```

## License

MIT
