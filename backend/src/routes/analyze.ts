import { Router, type Request, type Response, type IRouter } from "express";
import {
  getProposal,
  getLastInReviewProposal,
  getRecipientProfile,
} from "../lib/supabase/index.js";

const SOLANA_CHAIN = "solana";

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function checkAddressSecurity(address: string) {
  try {
    const data = await fetchJson(
      `https://api.gopluslabs.io/api/v1/address_security/${address}`
    );
    if (data.code !== 1) return { error: data.message };

    const r = data.result as Record<string, string>;
    const flags: string[] = [];

    if (r.cybercrime === "1")                       flags.push("Cybercrime associated");
    if (r.money_laundering === "1")                 flags.push("Money laundering associated");
    if (r.phishing_activities === "1")              flags.push("Phishing activities");
    if (r.stealing_attack === "1")                  flags.push("Stealing attack");
    if (r.blackmail_activities === "1")             flags.push("Blackmail activities");
    if (r.sanctioned === "1")                       flags.push("SANCTIONED address");
    if (r.malicious_mining_activities === "1")      flags.push("Malicious mining");
    if (r.darkweb_transactions === "1")             flags.push("Darkweb transactions");
    if (r.mixer === "1")                            flags.push("Mixer usage");
    if (r.fake_kyc === "1")                         flags.push("Fake KYC");
    if (r.blacklist_doubt === "1")                  flags.push("Blacklist doubt");
    if (r.financial_crime === "1")                  flags.push("Financial crime");
    if (Number(r.number_of_malicious_contracts_created) > 0)
      flags.push(`Created ${r.number_of_malicious_contracts_created} malicious contracts`);

    return {
      safe: flags.length === 0,
      flags,
      dataSource: r.data_source || "GoPlus",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkTokenSecurity(tokenAddress: string) {
  try {
    const data = await fetchJson(
      `https://api.gopluslabs.io/api/v1/${SOLANA_CHAIN}/token_security?contract_addresses=${tokenAddress}`
    );

    if (data.code !== 1) return { error: data.message };

    const result = data.result as Record<string, Record<string, unknown>>;
    const token  = result[tokenAddress.toLowerCase()] ?? result[tokenAddress];
    if (!token) return { error: "Token not found in GoPlus database" };

    const statusFrom = (field: unknown): string | null => {
      if (typeof field === "object" && field !== null && "status" in field) {
        const status = (field as { status?: unknown }).status;
        return typeof status === "string" ? status : null;
      }
      return null;
    };

    const flags: string[] = [];
    const metadata = (token.metadata ?? {}) as Record<string, unknown>;
    const info: Record<string, unknown> = {
      name:         metadata.name || "Unknown",
      symbol:       metadata.symbol || "Unknown",
      totalSupply:  token.total_supply,
      holderCount:  token.holder_count,
      trustedToken: token.trusted_token,
    };

    if (statusFrom(token.mintable) === "1")          flags.push("Mintable (supply can increase)");
    if (statusFrom(token.freezable) === "1")         flags.push("Freezable by authority");
    if (statusFrom(token.closable) === "1")          flags.push("Closable token account feature enabled");
    if (statusFrom(token.metadata_mutable) === "1")  flags.push("Metadata is mutable");
    if (Number(token.trusted_token) !== 1)           flags.push("Not marked as trusted token by GoPlus");
    if (token.dex == null || (Array.isArray(token.dex) && token.dex.length === 0)) {
      flags.push("No DEX liquidity pools found");
    }

    return { info, flags, safe: flags.length === 0 };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function checkRugcheck(mintAddress: string) {
  try {
    const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mintAddress}/report/summary`);
    if (!res.ok) return { error: `Rugcheck HTTP ${res.status}` };
    const data = await res.json() as Record<string, unknown>;
    return {
      score:  data.score,
      risks:  data.risks,
      rating: data.rating,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export function createAnalyzeRouter(): IRouter {
  const router = Router();

  /**
   * GET /analyze/:id — deep security analysis for a proposal
   * Use id = "latest" with ?vaultAddress=<base58> for the most recent in-review proposal.
   */
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const vaultAddress = (req.query.vaultAddress as string | undefined) ?? null;

      let id = req.params.id;
      if (id === "latest") {
        if (!vaultAddress) {
          res.status(400).json({ error: "vaultAddress required when id=latest" });
          return;
        }
        const latest = await getLastInReviewProposal(vaultAddress);
        if (!latest) {
          res.status(404).json({ error: "No in-review proposal found for this vault" });
          return;
        }
        id = latest.id;
      }

      const proposal = await getProposal(id);
      if (!proposal) {
        res.status(404).json({ error: `Proposal not found: ${id}` });
        return;
      }

      const toAddr     = proposal.to ?? "";
      const tokenAddr  = proposal.tokenAddress
      const isNativeSol = !tokenAddr || tokenAddr === "so11111111111111111111111111111111111111112";

      const profile = toAddr
        ? await getRecipientProfile(toAddr.toLowerCase(), proposal.vaultAddress)
        : null;

      const [addressSecurity, tokenSecurity, rugcheck] = await Promise.all([
        toAddr ? checkAddressSecurity(toAddr) : Promise.resolve(null),
        tokenAddr && !isNativeSol ? checkTokenSecurity(tokenAddr) : Promise.resolve(isNativeSol ? { nativeSol: true } : null),
        tokenAddr && !isNativeSol ? checkRugcheck(tokenAddr)     : Promise.resolve(null),
      ]);

      const allFlags: string[] = [];
      const addrFlags = (addressSecurity as { flags?: string[] } | null)?.flags;
      if (addrFlags) allFlags.push(...addrFlags);
      if (!profile)  allFlags.push("Unknown recipient (not in patterns)");

      res.json({
        proposalId: id,
        to:         toAddr,
        amount:     proposal.amount,
        token:      proposal.tokenSymbol,
        proposedAt: proposal.proposedAt,
        recipient: profile
          ? {
              known:        true,
              label:        profile.label ?? null,
              totalTxCount: profile.total_tx_count,
              avgAmount:    profile.avg_amount,
            }
          : { known: false },
        addressSecurity,
        tokenSecurity,
        rugcheck,
        totalFlags: allFlags.length,
        allFlags,
        safe: allFlags.length === 0,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  return router;
}
