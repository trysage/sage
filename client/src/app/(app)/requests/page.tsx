"use client";

import { motion } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { AgentId } from "@/components/AgentId";
import { EmptyRequests } from "@/components/empty";

export default function RequestsPage() {
  return (
    <div className="app-shell no-rail">
      <div className="ambient" />

      <Sidebar />

      <main className="main">
        <div className="main-top">
          <img src="/sage-mark-mint.png" alt="Sage" className="mobile-logo" />
          <AgentId />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.1 }}
        >
          <h1 className="page-title">Requests</h1>
          <p className="page-sub">Signature requests from connected dApps, reviewed by Sage before execution.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, type: "spring", bounce: 0.1 }}
        >
          <EmptyRequests />
        </motion.div>
      </main>
    </div>
  );
}
