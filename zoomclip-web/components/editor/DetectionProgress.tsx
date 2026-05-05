"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DetectionState } from "../../lib/clickDetection";

interface DetectionProgressProps {
  isVisible: boolean;
  state: DetectionState;
}

export const DetectionProgress: React.FC<DetectionProgressProps> = ({ isVisible, state }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-[var(--zoom-border)] bg-[var(--zoom-surface-light)] p-5 shadow-[var(--zoom-shadow)]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--zoom-accent)]/15">
              {/* Pulsing ring */}
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--zoom-accent)] opacity-20 animate-ping" />
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className="text-[var(--zoom-accent)] relative z-10"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--zoom-text-primary)]">Analyzing video…</p>
              <p className="text-xs text-[var(--zoom-text-secondary)]">Tracking cursor movement</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-[var(--zoom-border)] overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full bg-[var(--zoom-accent)]"
              style={{ width: `${state.pct}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Frame counter */}
          <div className="flex items-center justify-between text-xs text-[var(--zoom-text-secondary)] mb-3">
            <span>
              Frame{" "}
              <span className="font-mono text-[var(--zoom-text-primary)]">{state.frame}</span>
              {" / "}
              <span className="font-mono">{state.totalFrames}</span>
            </span>
            <span className="font-semibold text-[var(--zoom-accent)]">{state.pct}%</span>
          </div>

          {/* Found count */}
          <div className="flex items-center gap-2 text-xs rounded-lg bg-[var(--zoom-surface)] border border-[var(--zoom-border)] px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--zoom-success)]" />
            <span className="text-[var(--zoom-text-secondary)]">
              Found{" "}
              <span className="font-semibold text-[var(--zoom-text-primary)]">{state.foundCount}</span>
              {" "}click{state.foundCount !== 1 ? "s" : ""} so far
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
