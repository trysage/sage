"use client";

import { ExternalLink, Shield, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Dialog } from "./Dialog";
import { useWalletConnect } from "@/app/context/WalletConnectContext";
import { truncateAddress } from "@/utils/address";

export function WCTransactionRequest() {
  const {
    pendingRequest,
    requestStatus,
    requestSignature,
    requestError,
    approveRequest,
    rejectRequest,
    resetRequestState,
  } = useWalletConnect();

  const open = !!pendingRequest || requestStatus === "success" || requestStatus === "error";
  if (!open) return null;

  const handleClose = () => {
    if (requestStatus === "signing" || requestStatus === "polling" || requestStatus === "queued") return;
    resetRequestState();
  };

  const isProcessing =
    requestStatus === "signing" || requestStatus === "polling" || requestStatus === "queued";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={
        requestStatus === "success"
          ? "Transaction Sent"
          : requestStatus === "error"
          ? "Transaction Failed"
          : "Transaction Request"
      }
    >
      <div className="wc-prop-body">
        {/* DApp identity */}
        {pendingRequest && requestStatus !== "success" && requestStatus !== "error" && (
          <div className="wc-dapp-id">
            {pendingRequest.dappIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingRequest.dappIcon}
                alt=""
                className="wc-dapp-icon"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="wc-dapp-icon wc-dapp-icon-placeholder">
                <ExternalLink size={22} />
              </div>
            )}
            <div className="wc-dapp-meta">
              <span className="wc-dapp-name">{pendingRequest.dappName ?? "Unknown DApp"}</span>
              {pendingRequest.dappUrl && (
                <span className="wc-dapp-url">{pendingRequest.dappUrl}</span>
              )}
            </div>
          </div>
        )}

        {/* Idle / form state */}
        {requestStatus === "idle" && (
          <>
            <div className="wc-guard-note">
              <Shield size={14} />
              <span>This transaction will be screened by Sage before it leaves your vault.</span>
            </div>
            <div className="wc-actions">
              <button className="wc-btn-reject" onClick={rejectRequest}>Reject</button>
              <button className="wc-btn-approve" onClick={approveRequest}>Approve</button>
            </div>
          </>
        )}

        {/* Processing states */}
        {isProcessing && (
          <div className="wc-status-body">
            <Loader2 size={36} className="wc-spinner" />
            <span className="wc-status-label">
              {requestStatus === "signing" && "Creating vault proposal…"}
              {requestStatus === "queued" && "Queued for agent review…"}
              {requestStatus === "polling" && "Waiting for agent approval…"}
            </span>
            <span className="wc-status-sub">
              {requestStatus === "polling"
                ? "The Sage agent is reviewing this transaction. This may take a moment."
                : "Please wait while the transaction is being processed."}
            </span>
          </div>
        )}

        {/* Success */}
        {requestStatus === "success" && (
          <div className="wc-status-body">
            <CheckCircle2 size={36} className="wc-icon-success" />
            <span className="wc-status-label">Transaction executed</span>
            {requestSignature && (
              <span className="wc-sig">
                <span className="wc-sig-label">Signature</span>
                <span className="wc-sig-val mono">{truncateAddress(requestSignature)}</span>
              </span>
            )}
            <button className="wc-btn-approve" style={{ marginTop: 8 }} onClick={resetRequestState}>
              Done
            </button>
          </div>
        )}

        {/* Error */}
        {requestStatus === "error" && (
          <div className="wc-status-body">
            <XCircle size={36} className="wc-icon-error" />
            <span className="wc-status-label">Transaction failed</span>
            {requestError && (
              <span className="wc-status-sub wc-error-msg">{requestError}</span>
            )}
            <button className="wc-btn-reject" style={{ marginTop: 8 }} onClick={resetRequestState}>
              Close
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
