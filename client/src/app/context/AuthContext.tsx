"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";

export interface SolanaProvider {
  publicKey: { toBase58(): string };
  signMessage(msg: Uint8Array): Promise<{ signature: Uint8Array }>;
  signTransaction(tx: unknown): Promise<unknown>;
}

export interface AuthUser {
  email?: string;
  name?: string;
  image?: string;
}

export interface AuthWallet {
  address: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  wallet: AuthWallet | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  getSolanaProvider: () => Promise<SolanaProvider | null>;
  privyUser: ReturnType<typeof usePrivy>["user"];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    ready,
    authenticated,
    user: privyUser,
    login: privyLogin,
    logout: privyLogout,
  } = usePrivy();
  const { wallets, createWallet } = useSolanaWallets();

  const hasAttemptedCreate = useRef(false);

  const primaryWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === "privy"),
    [wallets]
  );

  useEffect(() => {
    if (!ready || !authenticated || primaryWallet) return;
    if (hasAttemptedCreate.current) return;
    hasAttemptedCreate.current = true;
    createWallet().catch((e) => {
      console.error("Privy createWallet (Solana) failed:", e);
      hasAttemptedCreate.current = false;
    });
  }, [ready, authenticated, primaryWallet, createWallet]);

  const user: AuthUser | null = useMemo(() => {
    if (!privyUser) return null;
    const google = (
      privyUser as {
        google?: { email?: string; name?: string; picture?: string };
      }
    ).google;
    return {
      email: google?.email,
      name: google?.name,
      image: google?.picture,
    };
  }, [privyUser]);

  const wallet: AuthWallet | null = useMemo(() => {
    if (!primaryWallet?.address) return null;
    return { address: primaryWallet.address };
  }, [primaryWallet]);

  const loading = !ready || (authenticated && !primaryWallet);

  const login = useCallback(() => {
    privyLogin();
  }, [privyLogin]);

  const logout = useCallback(async () => {
    await privyLogout();
  }, [privyLogout]);

  const getSolanaProvider = useCallback(async (): Promise<SolanaProvider | null> => {
    if (!primaryWallet) return null;
    try {
      const provider = await primaryWallet.getProvider();
      return provider as unknown as SolanaProvider;
    } catch (e) {
      console.error("getSolanaProvider failed:", e);
      return null;
    }
  }, [primaryWallet]);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      wallet,
      loading,
      login,
      logout,
      getSolanaProvider,
      privyUser: privyUser ?? null,
    }),
    [user, wallet, loading, login, logout, getSolanaProvider, privyUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider (inside PrivyProvider)");
  }
  return ctx;
}
