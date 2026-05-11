# Sage Agent Skills

Nanobot skill pack for **Sage** — an AI co-signer and security agent built on Squads Protocol V4 (Solana). It monitors pending multisig transactions, screens them against behavioral patterns and risk data, auto-executes safe ones, and flags or blocks suspicious activity before it lands on-chain.

The skill is conversational — it routes Telegram messages and button taps to the Sage API (`/execute`, `/transactions/:id`, `/analyze`, `/status`, `/rules`) using `AGENT_SECRET`. For ad-hoc security analysis, the agent also has access to **security tools over MCP** (GoPlus address & token intelligence, Rugcheck, sanctioned-address lookups), so the owner can ask "is this address safe?" or "why was this flagged?" and get a deep report inline.

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Nanobot** | Installed and configured — see the [Nanobot docs](https://github.com/nanobot-ai/nanobot) |
| **Node.js** | v18 or higher |
| **Environment variables** | `AGENT_SECRET` — the shared secret that authenticates the skill against the Sage API |
| **MCP servers** (optional) | Security tool MCP servers (GoPlus, Rugcheck, etc.) wired into Nanobot for deep analysis |

---

## Quick Start

### 1. Link the skill into Nanobot

From the Sage repo root:

```bash
mkdir -p ~/.nanobot/workspace/skills
ln -sf "$(pwd)/agents" ~/.nanobot/workspace/skills/sage
```

### 2. Restart Nanobot

```bash
nanobot gateway restart
```

Confirm that the Sage skill is detected:

```bash
nanobot skills check
```

Nanobot will load the skill from `SKILL.md` and begin responding to commands via Telegram.

---

## Alternative Skill Install Methods

### Copy into Nanobot's skill directory

```bash
mkdir -p ~/.nanobot/skills
cp -r /path/to/sage/agents ~/.nanobot/skills/sage
```

> If you copy, remember to re-copy after editing the skill source.

### Project-local skills

```bash
mkdir -p .nanobot/skills
ln -sf "$(pwd)/agents" .nanobot/skills/sage
```

---

For full usage details and owner commands, see **[SKILL.md](./SKILL.md)**.
