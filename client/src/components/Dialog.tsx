"use client";

import { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const exitingRef = useRef(false);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      exitingRef.current = false;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
    exitingRef.current = true;
  }, [open, handleEscape]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="dlg-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="dlg-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "dlg-title" : undefined}
            className={clsx("dlg-panel", className)}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            onAnimationComplete={() => {
              if (exitingRef.current) {
                document.body.style.overflow = "";
                exitingRef.current = false;
              }
            }}
          >
            <div className="dlg-handle" aria-hidden />

            <div className={clsx("dlg-head", !title && "dlg-head-notitle")}>
              {title && <h2 id="dlg-title" className="dlg-title">{title}</h2>}
              <button
                type="button"
                aria-label="Close"
                className="dlg-close"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dlg-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
