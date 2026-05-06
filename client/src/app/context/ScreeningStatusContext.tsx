"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStatus } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface ScreeningStatusContextType {
  screeningMode: boolean;
  botConnected: boolean;
  telegramLinked: boolean;
  fullyActivated: boolean;
  isScreeningActive: boolean;
  loading: boolean;
  setScreeningMode: (v: boolean) => void;
  setBotConnected: (v: boolean) => void;
  setTelegramLinked: (v: boolean) => void;
  refresh: () => Promise<void>;
}

const ScreeningStatusContext = createContext<ScreeningStatusContextType | null>(null);

export function ScreeningStatusProvider({ children }: { children: ReactNode }) {
  const { vaultPda, identityToken, telegramUserId } = useAuth();
  const [screeningMode, setScreeningMode] = useState(false);
  const [botConnected, setBotConnected] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Drive telegramLinked from Privy's linked accounts (same as zhentan)
  useEffect(() => {
    setTelegramLinked(!!telegramUserId);
  }, [telegramUserId]);

  const refresh = useCallback(async () => {
    if (!vaultPda || !identityToken) return;
    try {
      const data = await getStatus(vaultPda, identityToken);
      setScreeningMode(data.screeningMode ?? false);
      setBotConnected(data.botConnected ?? false);
    } catch {
      // silent
    }
  }, [vaultPda, identityToken]);

  useEffect(() => {
    if (!vaultPda) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [vaultPda, refresh]);

  const fullyActivated = telegramLinked && botConnected || true;
  const isScreeningActive = screeningMode && fullyActivated;

  const value = useMemo(
    () => ({
      screeningMode,
      botConnected,
      telegramLinked,
      fullyActivated,
      isScreeningActive,
      loading,
      setScreeningMode,
      setBotConnected,
      setTelegramLinked,
      refresh,
    }),
    [screeningMode, botConnected, telegramLinked, fullyActivated, isScreeningActive, loading, refresh]
  );

  return (
    <ScreeningStatusContext.Provider value={value}>
      {children}
    </ScreeningStatusContext.Provider>
  );
}

export function useScreeningStatus() {
  const ctx = useContext(ScreeningStatusContext);
  if (!ctx) throw new Error("useScreeningStatus must be inside ScreeningStatusProvider");
  return ctx;
}
