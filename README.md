# Sage

Multisig co-signer and security agent built on Squads Protocol (Solana). Sage acts as an autonomous second signer in 2-of-2 multisigs, evaluating pending proposals against policy rules before approving or rejecting — learning your patterns, weighing each call, and stepping in only when something is wrong.

## Structure

```
brandkit/   Brand assets — HTML reference pages (design system, logo system, playground, website)
site/       Marketing site + brand kit (Next.js 15, TypeScript, CSS Modules)
src/        Squads SDK wrappers (core agent library)
tests/      Test suite — multisig, proposal lifecycle, config, reference transfer flow
client/     Dapp — multisig dashboard (not started)
backend/    API server + agent co-signer logic (not started)
```

## Status

### Done

**Protocol layer (`src/`, `tests/`)**
- `src/multisig.ts` — `createMultisig`, `deriveVaultPda`, `getMultisigState`, `getProposalState`
- Full test suite: PDA derivation, permission bitmasks, proposal lifecycle, member/threshold config
- Reference 2-of-2 transfer flow (`tests/reference/transfer-flow.test.ts`) — complete walkthrough with Step 5 marked as the agent decision hook

**Marketing site (`site/`)**
- Landing page: Nav, Hero with live Guardian card, How It Works, Squads integration block, FAQ, CTA — fully mobile responsive
- Brand kit at `/brandkit`: design system, logo system, interactive logo playground with PNG/SVG/favicon export

### In progress

- [ ] Agent policy engine — plug decision logic into Step 5 of the transfer flow
- [ ] Telegram notification for borderline transactions

### Up next

**client**
- [ ] Bootstrap Next.js app with Solana wallet adapter (Phantom, Backpack)
- [ ] Multisig creation flow (name, members, threshold)
- [ ] Proposal dashboard (list, status badges, approve / reject)
- [ ] Vault overview (balance, transaction history)

**backend**
- [ ] Squads proposal watcher (poll pending proposals)
- [ ] Policy engine — configurable rules per multisig (amount limits, allowlists, time windows)
- [ ] Risk scoring module
- [ ] Agent co-signer calling `proposalApprove` / `proposalReject`
- [ ] Telegram bot notifications
- [ ] Auth middleware + database schema (users, policy rules, audit log)

**general**
- [ ] CI pipeline (lint, test, build)
- [ ] Deployment (site on Vercel, backend on Fly.io)
- [ ] `.env.example` templates

## Running tests

```bash
npm test                          # all suites (requires local validator at localhost:8899)
npm run test:multisig             # PDA derivation and multisig creation
npm run test:proposal             # proposal lifecycle
npm run test:config               # member and threshold management
npm run test:reference            # full 2-of-2 agentic co-signer flow

RPC_URL=https://api.devnet.solana.com npm run test:reference   # devnet
```

## Running the site

```bash
cd site
npm install
npm run dev     # http://localhost:3000
```
