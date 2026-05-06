"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ScreeningStatus {
  screeningMode: boolean;
  botConnected: boolean;
  telegramChatId: string | null;
  telegramLinked: boolean;
  fullyActivated: boolean;
  isScreeningActive: boolean;
  loading: boolean;
  setScreeningMode: (v: boolean) => void;
  setBotConnected: (v: boolean) => void;
  setTelegramChatId: (v: string | null) => void;
  refetch: () => void;
}

const ScreeningStatusContext = createContext<ScreeningStatus | null>(null);

export function ScreeningStatusProvider({ children }: { children: ReactNode }) {
  const { vaultPda, identityToken } = useAuth();
  const [screeningMode, setScreeningMode] = useState(false);
  const [botConnected, setBotConnected] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!vaultPda || !identityToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/status?vault=${encodeURIComponent(vaultPda)}`, {
      headers: { Authorization: `Bearer ${identityToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setScreeningMode(d.screeningMode ?? false);
        setBotConnected(d.botConnected ?? false);
        setTelegramChatId(d.telegramChatId ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vaultPda, identityToken]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const telegramLinked = !!telegramChatId;
  const fullyActivated = telegramLinked && botConnected;
  const isScreeningActive = screeningMode && fullyActivated;

  return (
    <ScreeningStatusContext.Provider
      value={{
        screeningMode,
        botConnected,
        telegramChatId,
        telegramLinked,
        fullyActivated,
        isScreeningActive,
        loading,
        setScreeningMode,
        setBotConnected,
        setTelegramChatId,
        refetch,
      }}
    >
      {children}
    </ScreeningStatusContext.Provider>
  );
}

export function useScreeningStatus() {
  const ctx = useContext(ScreeningStatusContext);
  if (!ctx) throw new Error("useScreeningStatus must be inside ScreeningStatusProvider");
  return ctx;
}
