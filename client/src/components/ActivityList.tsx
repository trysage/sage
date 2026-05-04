"use client";

import { motion } from "framer-motion";
import type { TransactionItem } from "@/lib/api";
import { ActivityRow } from "./ActivityRow";

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface Group {
  key: string;
  label: string;
  isToday: boolean;
  items: TransactionItem[];
}

function groupByDate(txs: TransactionItem[]): Group[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString();

  const map = new Map<string, Group>();

  for (const tx of txs) {
    const d = new Date(tx.executedAt ?? tx.proposedAt);
    const key = d.toDateString();

    if (!map.has(key)) {
      let label: string;
      let isToday = false;
      if (key === todayStr) {
        label = "Today";
        isToday = true;
      } else if (key === yesterdayStr) {
        label = "Yesterday";
      } else {
        label = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      }
      map.set(key, { key, label, isToday, items: [] });
    }

    map.get(key)!.items.push(tx);
  }

  return Array.from(map.values());
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, type: "spring" as const, bounce: 0.1 } },
};

interface ActivityListProps {
  transactions: TransactionItem[];
}

export function ActivityList({ transactions }: ActivityListProps) {
  const groups = groupByDate(transactions);

  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible">
      {groups.map(({ key, label, isToday, items }) => (
        <div key={key}>
          <p className="act-date-header">{label}</p>
          {items.map((tx) => {
            const ts = tx.executedAt ?? tx.proposedAt;
            return (
              <motion.div key={tx.id} variants={rowVariants}>
                <ActivityRow tx={tx} formattedTime={isToday ? undefined : timeOnly(ts)} />
              </motion.div>
            );
          })}
        </div>
      ))}
    </motion.div>
  );
}
