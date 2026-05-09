"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Core } from "@walletconnect/core";
import { WalletKit, type WalletKitTypes } from "@reown/walletkit";
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import { PublicKey } from "@solana/web3.js";
import { useAuth } from "./AuthContext";
import { useScreeningStatus } from "./ScreeningStatusContext";
import { loadSageAccount } from "@/lib/squads";
import { proposeDappTransactionSolana, pollForSignature } from "@/lib/propose-dapp-solana";

// Solana chain IDs (mainnet + devnet so dApps on either chain can connect)
const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const SOLANA_DEVNET  = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

const SUPPORTED_METHODS = [
  "solana_signAndSendTransaction",
  "solana_signTransaction",
];
const SUPPORTED_EVENTS: string[] = [];

type SessionMap = Record<string, WalletKitTypes.SessionRequest["params"]>;

export interface WCPendingRequest {
  id: number;
  topic: string;
  method: string;
  /** base64-encoded serialized transaction */
  transaction: string;
  dappName?: string;
  dappUrl?: string;
  dappIcon?: string;
}

interface WalletConnectContextType {
  ready: boolean;
  pair: (uri: string) => Promise<void>;
  sessions: SessionMap;
  sessionProposal: WalletKitTypes.SessionProposal | null;
  pendingRequest: WCPendingRequest | null;
  approveSession: () => Promise<void>;
  rejectSession: () => Promise<void>;
  approveRequest: () => Promise<string>;
  rejectRequest: () => Promise<void>;
  disconnectSession: (topic: string) => Promise<void>;
  requestStatus: "idle" | "signing" | "queued" | "polling" | "success" | "error";
  requestSignature: string | null;
  requestError: string | null;
  resetRequestState: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextType | null>(null);

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const { wallet, vaultPda, identityToken, getSolanaWallet } = useAuth();
  const { isScreeningActive } = useScreeningStatus();

  const [walletKit, setWalletKit] = useState<InstanceType<typeof WalletKit> | null>(null);
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<SessionMap>({});
  const [sessionProposal, setSessionProposal] = useState<WalletKitTypes.SessionProposal | null>(null);
  const [pendingRequest, setPendingRequest] = useState<WCPendingRequest | null>(null);
  const [requestStatus, setRequestStatus] = useState<WalletConnectContextType["requestStatus"]>("idle");
  const [requestSignature, setRequestSignature] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const walletKitRef = useRef<InstanceType<typeof WalletKit> | null>(null);
  const initRef = useRef(false);

  // Initialize WalletKit once
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId || initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const core = new Core({ projectId });
        const kit = await WalletKit.init({
          core,
          metadata: {
            name: "Sage",
            description: "AI-secured multisig wallet on Solana",
            url: "https://sage.consensolabs.com",
            icons: ["/sage-mark-mint.png"],
          },
        });
        walletKitRef.current = kit;
        setWalletKit(kit);
        setReady(true);

        // Restore persisted sessions
        const active = kit.getActiveSessions();
        if (active && Object.keys(active).length > 0) {
          const mapped: SessionMap = {};
          for (const [topic, session] of Object.entries(active)) {
            mapped[topic] = session as unknown as WalletKitTypes.SessionRequest["params"];
          }
          setSessions(mapped);
        }
      } catch (err) {
        console.error("[WalletConnect] WalletKit init failed:", err);
      }
    })();
  }, []);

  // Register event listeners whenever walletKit or vaultPda change
  useEffect(() => {
    if (!walletKit) return;

    const handleSessionProposal = (proposal: WalletKitTypes.SessionProposal) => {
      setSessionProposal(proposal);
    };

    const handleSessionRequest = (event: WalletKitTypes.SessionRequest) => {
      const { id, topic, params } = event;
      const { request } = params;

      const activeSessions = walletKit.getActiveSessions();
      const peer = activeSessions[topic]?.peer?.metadata;

      if (
        request.method === "solana_signAndSendTransaction" ||
        request.method === "solana_signTransaction"
      ) {
        // params can be { transaction } or [{ transaction }]
        const raw = Array.isArray(request.params) ? request.params[0] : request.params;
        console.log("raw", raw);
        const transaction = (raw as { transaction?: string }).transaction;
        console.log("transaction", transaction);
        if (!transaction) {
          walletKit.respondSessionRequest({
            topic,
            response: { id, jsonrpc: "2.0", error: { code: -32602, message: "Missing transaction" } },
          });
          return;
        }
        setPendingRequest({
          id,
          topic,
          method: request.method,
          transaction,
          dappName: peer?.name,
          dappUrl: peer?.url,
          dappIcon: peer?.icons?.[0],
        });
        return;
      }

      // Immediately reject unsupported methods
      walletKit.respondSessionRequest({
        topic,
        response: { id, jsonrpc: "2.0", error: getSdkError("UNSUPPORTED_METHODS") },
      });
    };

    const handleSessionDelete = () => {
      const active = walletKit.getActiveSessions();
      const mapped: SessionMap = {};
      for (const [topic, session] of Object.entries(active)) {
        mapped[topic] = session as unknown as WalletKitTypes.SessionRequest["params"];
      }
      setSessions(mapped);
    };

    walletKit.on("session_proposal", handleSessionProposal);
    walletKit.on("session_request", handleSessionRequest);
    walletKit.on("session_delete", handleSessionDelete);

    return () => {
      walletKit.off("session_proposal", handleSessionProposal);
      walletKit.off("session_request", handleSessionRequest);
      walletKit.off("session_delete", handleSessionDelete);
    };
  }, [walletKit]);

  const pair = useCallback(async (uri: string) => {
    if (!walletKit) throw new Error("WalletKit not ready");
    await walletKit.pair({ uri });
  }, [walletKit]);

  const approveSession = useCallback(async () => {
    if (!walletKit || !sessionProposal || !vaultPda) return;

    // Build namespaces manually — buildApprovedNamespaces returns {} when
    // the dApp uses optionalNamespaces-only or requests chains/methods not
    // in our supported set, which causes approveSession to throw.
    let namespaces: ReturnType<typeof buildApprovedNamespaces>;
    try {
      namespaces = buildApprovedNamespaces({
        proposal: sessionProposal.params,
        supportedNamespaces: {
          solana: {
            chains: [SOLANA_MAINNET, SOLANA_DEVNET],
            methods: SUPPORTED_METHODS,
            events: SUPPORTED_EVENTS,
            accounts: [
              `${SOLANA_MAINNET}:${vaultPda}`,
              `${SOLANA_DEVNET}:${vaultPda}`,
            ],
          },
        },
      });
    } catch {
      namespaces = undefined as unknown as ReturnType<typeof buildApprovedNamespaces>;
    }

    // Fall back to a manually constructed namespaces object when
    // buildApprovedNamespaces fails or returns empty.
    const approvedNamespaces =
      namespaces && Object.keys(namespaces).length > 0
        ? namespaces
        : {
            solana: {
              chains: [SOLANA_MAINNET, SOLANA_DEVNET],
              methods: SUPPORTED_METHODS,
              events: SUPPORTED_EVENTS,
              accounts: [
                `${SOLANA_MAINNET}:${vaultPda}`,
                `${SOLANA_DEVNET}:${vaultPda}`,
              ],
            },
          };

    await walletKit.approveSession({ id: sessionProposal.id, namespaces: approvedNamespaces });
    setSessionProposal(null);

    const active = walletKit.getActiveSessions();
    const mapped: SessionMap = {};
    for (const [topic, session] of Object.entries(active)) {
      mapped[topic] = session as unknown as WalletKitTypes.SessionRequest["params"];
    }
    setSessions(mapped);
  }, [walletKit, sessionProposal, vaultPda]);

  const rejectSession = useCallback(async () => {
    if (!walletKit || !sessionProposal) return;
    await walletKit.rejectSession({ id: sessionProposal.id, reason: getSdkError("USER_REJECTED") });
    setSessionProposal(null);
  }, [walletKit, sessionProposal]);

  const approveRequest = useCallback(async (): Promise<string> => {
    if (!walletKit || !pendingRequest || !wallet || !vaultPda) {
      throw new Error("Not ready to approve request");
    }

    const solanaWallet = getSolanaWallet();
    if (!solanaWallet) throw new Error("Solana wallet not available");

    const account = loadSageAccount(wallet.address);
    if (!account) throw new Error("Sage account not found — please reconnect");

    setRequestStatus("signing");

    try {
      console.log("pendingRequest.transaction", pendingRequest);
      const txBytes = Buffer.from(pendingRequest.transaction, "base64");
      console.log("txBytes", txBytes);

      const result = await proposeDappTransactionSolana({
        serializedTx: new Uint8Array(txBytes),
        solanaWallet,
        multisigPda: new PublicKey(account.multisigPda),
        vaultPda,
        identityToken,
        screeningDisabled: !isScreeningActive,
      });
      console.log("result", result);
      let signature: string;

      if (result.signature) {
        // Screening off (executed immediately) or AI auto-approved+executed
        signature = result.signature;
      } else {
        setRequestStatus("polling");
        signature = await pollForSignature(result.proposalId, vaultPda, identityToken);
      }

      setRequestStatus("success");
      setRequestSignature(signature);

      // solana_signAndSendTransaction → { signature }
      // solana_signTransaction → { transaction } (original bytes; dApp broadcasts,
      //   gets "already processed" since Squads already executed it — harmless)
      const wcResult =
        pendingRequest.method === "solana_signTransaction"
          ? { transaction: pendingRequest.transaction }
          : { signature };

      await walletKit.respondSessionRequest({
        topic: pendingRequest.topic,
        response: { id: pendingRequest.id, jsonrpc: "2.0", result: wcResult },
      });

      setPendingRequest(null);
      return signature;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setRequestStatus("error");
      setRequestError(message);

      await walletKit.respondSessionRequest({
        topic: pendingRequest.topic,
        response: {
          id: pendingRequest.id,
          jsonrpc: "2.0",
          error: { code: -32000, message },
        },
      }).catch(() => {});

      throw err;
    }
  }, [walletKit, pendingRequest, wallet, vaultPda, getSolanaWallet, identityToken, isScreeningActive]);

  const rejectRequest = useCallback(async () => {
    if (!walletKit || !pendingRequest) return;
    await walletKit.respondSessionRequest({
      topic: pendingRequest.topic,
      response: {
        id: pendingRequest.id,
        jsonrpc: "2.0",
        error: getSdkError("USER_REJECTED"),
      },
    });
    setPendingRequest(null);
    setRequestStatus("idle");
  }, [walletKit, pendingRequest]);

  const disconnectSession = useCallback(async (topic: string) => {
    if (!walletKit) return;
    await walletKit.disconnectSession({ topic, reason: getSdkError("USER_DISCONNECTED") });
    setSessions((prev) => {
      const next = { ...prev };
      delete next[topic];
      return next;
    });
  }, [walletKit]);

  const resetRequestState = useCallback(() => {
    setRequestStatus("idle");
    setRequestSignature(null);
    setRequestError(null);
  }, []);

  const value: WalletConnectContextType = {
    ready,
    pair,
    sessions,
    sessionProposal,
    pendingRequest,
    approveSession,
    rejectSession,
    approveRequest,
    rejectRequest,
    disconnectSession,
    requestStatus,
    requestSignature,
    requestError,
    resetRequestState,
  };

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect() {
  const ctx = useContext(WalletConnectContext);
  if (!ctx) throw new Error("useWalletConnect must be used within WalletConnectProvider");
  return ctx;
}
