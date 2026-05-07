"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const IDLE_MESSAGES = [
  { text: "All clear. Nothing suspicious in the last hour.", em: null },
  { text: "Every signature goes through me before it lands.", em: null },
  { text: "Watching the mempool.", em: "Nothing gets past." },
  { text: "Your vault is clean.", em: "I'll tell you if that changes." },
  { text: "No unusual activity detected.", em: "Staying sharp." },
  { text: "I screen every transaction — even the boring ones.", em: null },
  { text: "On duty.", em: "24 / 7, no days off." },
  { text: "Running policy checks in the background.", em: null },
];

const PENDING_MESSAGES = [
  { text: "I've paused a transaction.", em: "It needs your eyes." },
  { text: "Something came in.", em: "You should take a look." },
  { text: "One transaction is waiting for your call.", em: null },
  { text: "I flagged something.", em: "Review it before it moves." },
];

const INTERVAL = 5000;

interface AgentQuoteProps {
  hasPending: boolean;
}

export function AgentQuote({ hasPending }: AgentQuoteProps) {
  const pool = hasPending ? PENDING_MESSAGES : IDLE_MESSAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [hasPending]);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [pool.length]);

  const msg = pool[index];

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={`${hasPending}-${index}`}
        className="rail-quote"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {msg.text}
        {msg.em && (
          <>
            {" "}
            <em>{msg.em}</em>
          </>
        )}
      </motion.p>
    </AnimatePresence>
  );
}
