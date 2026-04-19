# Sage

Multisig co-signer and security agent built on Squads Protocol (Solana). Sage acts as an autonomous second signer in n-of-m multisigs, evaluating pending proposals against configurable policy rules before approving or rejecting.

## Structure

```
brandkit/   Brand assets — logos, color palette, typography
client/     Dapp — multisig dashboard and proposal management
site/       Marketing landing page
backend/    API server + agent co-signer logic
src/        Squads SDK wrappers (core agent library)
tests/      Test suite for the core library
```

## TODO

### brandkit
- [ ] Design logo (light and dark variants)
- [ ] Define color palette and design tokens
- [ ] Create social media cover images and banners
- [ ] Export icon set (SVG + PNG)

### client
- [ ] Bootstrap Next.js app with Tailwind
- [ ] Integrate Solana wallet adapter (Phantom, Backpack)
- [ ] Multisig creation flow (name, members, threshold)
- [ ] Proposal dashboard (list, status badges, approve / reject actions)
- [ ] Vault overview (balance, transaction history)
- [ ] Connect to backend API

### site
- [ ] Hero section with product pitch
- [ ] Feature highlights (co-signer, policy engine, risk scoring)
- [ ] How-it-works section
- [ ] CTA linking to the dapp
- [ ] SEO meta tags and OG images

### backend
- [ ] Express server with health endpoint
- [ ] Squads proposal watcher (poll or webhook for pending proposals)
- [ ] Policy engine — configurable rules per multisig (amount limits, allowlists, time windows)
- [ ] Risk scoring module wired to the policy engine
- [ ] Agent co-signer — call `proposalApprove` / `proposalReject` based on policy result
- [ ] Notification delivery (Telegram bot, email)
- [ ] Database schema (users, policy rules, audit log)
- [ ] Auth middleware for client API calls

### general
- [ ] Root `pnpm-workspace.yaml` and per-package `package.json` stubs
- [ ] CI pipeline (lint, test, build)
- [ ] Deployment setup (client + site on Vercel, backend on Fly.io or VPS)
- [ ] Environment variable templates (`.env.example`) for each package
