# Sage Agent Skills

OpenClaw skill pack for **Sage** — an AI co-signer and security agent built on Squads Protocol V4 (Solana). It monitors pending multisig transactions, screens them against behavioral patterns and risk data, auto-executes safe ones, and flags or blocks suspicious activity before it lands on-chain.

---

## Prerequisites

| Requirement | Details |
|---|---|
| **OpenClaw** | Installed and configured — [OpenClaw setup guide](https://github.com/anthropics/openclaw) |
| **Node.js** | v18 or higher |
| **Environment variables** | `AGENT_SECRET` — the shared secret that authenticates the skill against the Sage API |

---

## Quick Start

### 1. Link the skill into OpenClaw

From the Sage repo root:

```bash
mkdir -p ~/.openclaw/workspace/skills
ln -sf "$(pwd)/agents" ~/.openclaw/workspace/skills/sage
```

### 2. Restart OpenClaw

```bash
openclaw gateway restart
```

Confirm that the Sage skill is detected:

```bash
openclaw skills check
```

OpenClaw will load the skill from `SKILL.md` and begin responding to commands via Telegram.

---

## Alternative Skill Install Methods

### Copy into OpenClaw's skill directory

```bash
mkdir -p ~/.openclaw/skills
cp -r /path/to/sage/agents ~/.openclaw/skills/sage
```

> If you copy, remember to re-copy after editing the skill source.

### Project-local skills

```bash
mkdir -p .openclaw/skills
ln -sf "$(pwd)/agents" .openclaw/skills/sage
```

---

For full usage details and owner commands, see **[SKILL.md](./SKILL.md)**.
