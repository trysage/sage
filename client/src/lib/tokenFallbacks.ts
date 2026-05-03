import type { TokenPosition } from "./api";

const SOLANA_CHAIN: TokenPosition["chain"] = {
  id: "solana",
  chainId: 900,
  name: "Solana",
};

const FALLBACKS: Omit<TokenPosition, "usdValue" | "balance" | "price" | "priceChange1d" | "pricePercentChange1d">[] = [
  {
    id: "fallback-sol",
    tokenId: "11111111111111111111111111111111",
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
    address: "",
    iconUrl: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
    chain: SOLANA_CHAIN,
    verified: true,
  },
  {
    id: "fallback-usdc",
    tokenId: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    iconUrl: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    chain: SOLANA_CHAIN,
    verified: true,
  },
  {
    id: "fallback-usdt",
    tokenId: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    iconUrl: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
    chain: SOLANA_CHAIN,
    verified: true,
  },
  {
    id: "fallback-usds",
    tokenId: "665d1d2c-7add-45e2-b08a-1c584ca19caf",
    name: "USDS",
    symbol: "USDS",
    decimals: 6,
    address: "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA",
    iconUrl: "https://cdn.zerion.io/665d1d2c-7add-45e2-b08a-1c584ca19caf.png",
    chain: SOLANA_CHAIN,
    verified: true,
  },
  {
    id: "fallback-wbtc",
    tokenId: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    name: "Wrapped BTC",
    symbol: "WBTC",
    decimals: 8,
    address: "5XZw2LKTyrfvfiskJ78AMpackRjPcyCif1WhUsPDuVqQ",
    iconUrl: "https://cdn.zerion.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
    chain: SOLANA_CHAIN,
    verified: true,
  },
  {
    id: "fallback-cbtc",
    tokenId: "cce1c828-cb06-410e-8f3c-9b729d6e344d",
    name: "Coinbase Wrapped BTC",
    symbol: "cbBTC",
    decimals: 6,
    address: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    iconUrl: "https://cdn.zerion.io/cce1c828-cb06-410e-8f3c-9b729d6e344d.png",
    chain: SOLANA_CHAIN,
    verified: true,
  },
    {
    id: "fallback-weth",
    tokenId: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 8,
    address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    iconUrl: "https://cdn.zerion.io/cce1c828-cb06-410e-8f3c-9b729d6e344d.png",
    chain: SOLANA_CHAIN,
    verified: true,
  },
];

/**
 * Pads `tokens` with zero-balance Solana fallback entries so the list has
 * at least `minCount` items. Fallbacks already in the portfolio are skipped.
 */
export function padTokensWithFallbacks(
  tokens: TokenPosition[],
  minCount = 5
): TokenPosition[] {
  if (tokens.length >= minCount) return tokens;

  const existingAddresses = new Set(tokens.map(t => t.address?.toLowerCase()).filter(Boolean));
  const existingTokenIds = new Set(tokens.map(t => t.tokenId?.toLowerCase()).filter(Boolean));

  const needed = minCount - tokens.length;
  const placeholders: TokenPosition[] = [];

  for (const fb of FALLBACKS) {
    if (placeholders.length >= needed) break;
    if (fb.address && existingAddresses.has(fb.address.toLowerCase())) continue;
    if (fb.tokenId && existingTokenIds.has(fb.tokenId.toLowerCase())) continue;
    placeholders.push({
      ...fb,
      balance: "0",
      usdValue: null,
      price: 0,
      priceChange1d: null,
      pricePercentChange1d: null,
      placeholder: true,
    });
  }

  return [...tokens, ...placeholders];
}
