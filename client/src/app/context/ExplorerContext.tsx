"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type Explorer = "solana" | "solscan" | "solanafm" | "xray";

export interface ExplorerDef {
  id: Explorer;
  label: string;
  host: string;
  txUrl: (sig: string) => string;
}

export const EXPLORERS: ExplorerDef[] = [
  {
    id: "solana",
    label: "Solana Explorer",
    host: "explorer.solana.com",
    txUrl: (sig) => `https://explorer.solana.com/tx/${sig}`,
  },
  {
    id: "solscan",
    label: "Solscan",
    host: "solscan.io",
    txUrl: (sig) => `https://solscan.io/tx/${sig}`,
  },
  {
    id: "solanafm",
    label: "SolanaFM",
    host: "solana.fm",
    txUrl: (sig) => `https://solana.fm/tx/${sig}?cluster=mainnet-alpha`,
  },
  {
    id: "xray",
    label: "XRAY by Helius",
    host: "xray.helius.xyz",
    txUrl: (sig) => `https://xray.helius.xyz/tx/${sig}`,
  },
];

const EXPLORER_KEY = "sage_explorer";

interface ExplorerContextType {
  explorer: Explorer;
  setExplorer: (e: Explorer) => void;
  txUrl: (sig: string) => string;
}

const ExplorerContext = createContext<ExplorerContextType | null>(null);

export function ExplorerProvider({ children }: { children: ReactNode }) {
  const [explorer, setExplorerState] = useState<Explorer>("solana");

  useEffect(() => {
    const stored = localStorage.getItem(EXPLORER_KEY) as Explorer | null;
    if (stored && EXPLORERS.some((e) => e.id === stored)) setExplorerState(stored);
  }, []);

  const setExplorer = useCallback((e: Explorer) => {
    localStorage.setItem(EXPLORER_KEY, e);
    setExplorerState(e);
  }, []);

  const txUrl = useCallback(
    (sig: string) => EXPLORERS.find((e) => e.id === explorer)!.txUrl(sig),
    [explorer]
  );

  const value = useMemo(
    () => ({ explorer, setExplorer, txUrl }),
    [explorer, setExplorer, txUrl]
  );

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>;
}

export function useExplorer() {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error("useExplorer must be used inside ExplorerProvider");
  return ctx;
}
