"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  usePrivy,
  useWallets,
  useCreateWallet,
  useIdentityToken,
  useLoginWithOAuth,
  useLogout,
} from "@privy-io/react-auth";
import {
  useWallets as useSolanaWallets,
  useCreateWallet as useSolanaCreateWallet,
  type ConnectedStandardSolanaWallet,
} from "@privy-io/react-auth/solana";
import { Connection } from "@solana/web3.js";
import {
  createSageAccount,
  loadSageAccount,
  clearSageAccount,
} from "@/lib/squads";

const OAUTH_PENDING_KEY = "sage_oauth_pending";
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

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
  /** Primary Solana embedded wallet */
  wallet: AuthWallet | null;
  /** EVM embedded wallet */
  evmWallet: AuthWallet | null;
  /** Squads vault PDA for this user */
  vaultPda: string | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  /** Raw Solana wallet for signing */
  getSolanaWallet: () => ConnectedStandardSolanaWallet | null;
  identityToken: string | null;
  privyUser: ReturnType<typeof usePrivy>["user"];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();
  const { logout: privyLogout } = useLogout();

  // EVM wallet hooks
  const { wallets: evmWallets } = useWallets();
  const { createWallet: createEvmWallet } = useCreateWallet();

  // Solana wallet hooks
  const { wallets: solanaWallets } = useSolanaWallets();
  const { createWallet: createSolanaWallet } = useSolanaCreateWallet();

  const { identityToken } = useIdentityToken();

  const hasAttemptedEvmCreate = useRef(false);
  const hasAttemptedSolanaCreate = useRef(false);
  const hasAttemptedSageCreate = useRef(false);
  const [evmCreateFailed, setEvmCreateFailed] = useState(false);
  const [solanaCreateFailed, setSolanaCreateFailed] = useState(false);
  const [vaultPda, setVaultPda] = useState<string | null>(
    () => loadSageAccount()?.vaultPda.toBase58() ?? null
  );
  const [sageCreateFailed, setSageCreateFailed] = useState(false);

  // Persisted flag so the loader holds across the OAuth full-page redirect.
  // Set before initOAuth fires; cleared once Privy confirms authenticated.
  const [oAuthPending, setOAuthPending] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(OAUTH_PENDING_KEY) === "1"
  );

  useEffect(() => {
    if (authenticated && oAuthPending) {
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setOAuthPending(false);
    }
  }, [authenticated, oAuthPending]);

  const primaryEvmWallet = useMemo(
    () => evmWallets.find((w) => w.walletClientType === "privy") ?? null,
    [evmWallets]
  );

  const primarySolanaWallet = useMemo(
    () => solanaWallets[0] ?? null,
    [solanaWallets]
  );

  // Manual EVM wallet creation
  useEffect(() => {
    if (!ready || !authenticated || primaryEvmWallet || evmCreateFailed) return;
    if (hasAttemptedEvmCreate.current) return;
    hasAttemptedEvmCreate.current = true;
    createEvmWallet().catch((e) => {
      console.error("EVM wallet creation failed:", e);
      setEvmCreateFailed(true);
    });
  }, [ready, authenticated, primaryEvmWallet, evmCreateFailed, createEvmWallet]);

  // Manual Solana wallet creation
  useEffect(() => {
    if (!ready || !authenticated || primarySolanaWallet || solanaCreateFailed) return;
    if (hasAttemptedSolanaCreate.current) return;
    hasAttemptedSolanaCreate.current = true;
    createSolanaWallet().catch((e) => {
      console.error("Solana wallet creation failed:", e);
      setSolanaCreateFailed(true);
    });
  }, [ready, authenticated, primarySolanaWallet, solanaCreateFailed, createSolanaWallet]);

  // Sage account creation — runs once after Solana wallet is ready
  useEffect(() => {
    if (!primarySolanaWallet || vaultPda || sageCreateFailed) return;
    if (hasAttemptedSageCreate.current) return;
    hasAttemptedSageCreate.current = true;
    const connection = new Connection(RPC_URL, "confirmed");
    createSageAccount(connection, primarySolanaWallet)
      .then((info) => setVaultPda(info.vaultPda.toBase58()))
      .catch((e) => {
        console.error("Sage account creation failed:", e);
        setSageCreateFailed(true);
      });
  }, [primarySolanaWallet, vaultPda, sageCreateFailed]);

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
    if (!primarySolanaWallet?.address) return null;
    return { address: primarySolanaWallet.address };
  }, [primarySolanaWallet]);

  const evmWallet: AuthWallet | null = useMemo(() => {
    if (!primaryEvmWallet?.address) return null;
    return { address: primaryEvmWallet.address };
  }, [primaryEvmWallet]);

  // Stay loading while:
  // 1. Privy SDK not ready
  // 2. OAuth redirect is in flight (sessionStorage flag bridges the page reload gap)
  // 3. Authenticated but Solana wallet not yet created (EVM creation runs in background)
  // 4. Solana wallet ready but Sage vault account not yet created
  const loading =
    !ready ||
    oAuthPending ||
    (authenticated && !primarySolanaWallet && !solanaCreateFailed) ||
    (!!primarySolanaWallet && !vaultPda && !sageCreateFailed);

  const login = useCallback(() => {
    sessionStorage.setItem(OAUTH_PENDING_KEY, "1");
    setOAuthPending(true);
    initOAuth({ provider: "google" });
  }, [initOAuth]);

  const logout = useCallback(async () => {
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    clearSageAccount();
    setVaultPda(null);
    hasAttemptedSageCreate.current = false;
    await privyLogout();
  }, [privyLogout]);

  const getSolanaWallet = useCallback(
    () => primarySolanaWallet,
    [primarySolanaWallet]
  );

  const value: AuthContextType = useMemo(
    () => ({
      user,
      wallet,
      evmWallet,
      vaultPda,
      loading,
      login,
      logout,
      getSolanaWallet,
      identityToken: identityToken ?? null,
      privyUser: privyUser ?? null,
    }),
    [user, wallet, evmWallet, vaultPda, loading, login, logout, getSolanaWallet, identityToken, privyUser]
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
