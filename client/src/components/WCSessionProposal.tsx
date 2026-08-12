"use client";

import { Shield, ExternalLink } from "lucide-react";
import { Dialog } from "./Dialog";
import { useWalletConnect } from "@/app/context/WalletConnectContext";

export function WCSessionProposal() {
  const { sessionProposal, approveSession, rejectSession } = useWalletConnect();
  if (!sessionProposal) return null;

  const peer = sessionProposal.params.proposer.metadata;
  const name = peer.name || "Unknown DApp";
  const url = peer.url || "";
  const icon = peer.icons?.[0];
  const description = peer.description || "";

  const requiredNamespaces = sessionProposal.params.requiredNamespaces;
  const solana = requiredNamespaces?.solana;
  const chains = solana?.chains ?? [];
  const methods = solana?.methods ?? [];

  return (
    <Dialog open onClose={rejectSession} title="Connection Request">
      <div className="wc-prop-body">
        {/* DApp identity */}
        <div className="wc-dapp-id">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="wc-dapp-icon" referrerPolicy="no-referrer" />
          ) : (
            <div className="wc-dapp-icon wc-dapp-icon-placeholder">
              <ExternalLink size={22} />
            </div>
          )}
          <div className="wc-dapp-meta">
            <span className="wc-dapp-name">{name}</span>
            {url && <span className="wc-dapp-url">{url}</span>}
            {description && <span className="wc-dapp-desc">{description}</span>}
          </div>
        </div>

        {/* Security note */}
        <div className="wc-guard-note">
          <Shield size={14} />
          <span>Transactions from this DApp will be screened by Sage before execution.</span>
        </div>

        {/* Requested permissions */}
        {(chains.length > 0 || methods.length > 0) && (
          <div className="wc-perms">
            <span className="wc-perms-label">Requested permissions</span>
            {chains.length > 0 && (
              <span className="wc-perms-row">
                <span className="wc-perms-key">Chains</span>
                <span className="wc-perms-val">{chains.join(", ")}</span>
              </span>
            )}
            {methods.length > 0 && (
              <span className="wc-perms-row">
                <span className="wc-perms-key">Methods</span>
                <span className="wc-perms-val">
                  {methods.slice(0, 4).join(", ")}
                  {methods.length > 4 && ` +${methods.length - 4} more`}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="wc-actions">
          <button className="wc-btn-reject" onClick={rejectSession}>Reject</button>
          <button className="wc-btn-approve" onClick={approveSession}>Connect</button>
        </div>
      </div>
    </Dialog>
  );
}
