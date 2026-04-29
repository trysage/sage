"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, Copy, Check } from "lucide-react";
import QRCode from "react-qr-code";
import { Dialog } from "./Dialog";

interface ReceiveDialogProps {
  open: boolean;
  onClose: () => void;
  address: string | null;
}

export function ReceiveDialog({ open, onClose, address }: ReceiveDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return (
    <Dialog open={open} onClose={onClose} title="Receive">
      <div className="rdlg-body">
        {/* Icon */}
        <motion.div
          className="rdlg-icon"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.35, delay: 0.05 }}
        >
          <ArrowDownLeft size={22} />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="rdlg-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Send SOL or any SPL token to your Sage vault
        </motion.p>

        {/* QR Code */}
        {address && (
          <motion.div
            className="rdlg-qr"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, type: "spring", bounce: 0.15 }}
          >
            <QRCode
              value={address}
              size={180}
              bgColor="#ffffff"
              fgColor="#0A0D0E"
              level="M"
            />
          </motion.div>
        )}

        {/* Address */}
        <motion.div
          className="rdlg-addr-block"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <span className="rdlg-addr-label">Vault address</span>
          <span className="rdlg-addr">{address ?? "—"}</span>
        </motion.div>

        {/* Copy button */}
        <motion.button
          type="button"
          className="rdlg-copy"
          onClick={handleCopy}
          disabled={!address}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          whileTap={{ scale: 0.97 }}
        >
          {copied ? (
            <>
              <Check size={15} />
              Copied
            </>
          ) : (
            <>
              <Copy size={15} />
              Copy address
            </>
          )}
        </motion.button>
      </div>
    </Dialog>
  );
}
