"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ExportButtonProps {
  onExport: (format: "mp4" | "gif" | "720p") => void;
  isExporting: boolean;
  progress: number;
}

type ExportFormat = "mp4" | "gif" | "720p";

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport, isExporting, progress }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isExporting) {
    return (
      <div className="relative overflow-hidden w-40 h-9 rounded-[var(--zoom-radius-button)] bg-[var(--zoom-surface-light)] border border-[var(--zoom-border)] flex items-center justify-center">
        <div 
          className="absolute inset-y-0 left-0 bg-[var(--zoom-accent)]/80 transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative z-10 text-xs font-medium text-white drop-shadow-md">
          {progress === 1 ? "Complete" : `Processing... ${Math.round(progress * 100)}%`}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 h-9 rounded-[var(--zoom-radius-button)] text-white text-sm font-medium"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        Export
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-[var(--zoom-surface-light)] border border-[var(--zoom-border)] rounded-[var(--zoom-radius-panel)] shadow-[var(--zoom-shadow)] p-1 z-50 flex flex-col"
          >
            {[
              { id: "mp4" as const, label: "Export MP4 (1080p)" },
              { id: "720p" as const, label: "Export 720p" },
              { id: "gif" as const, label: "Export GIF" },
            ].map((opt: { id: ExportFormat; label: string }) => (
              <button
                key={opt.id}
                onClick={() => {
                  setIsOpen(false);
                  onExport(opt.id);
                }}
                className="text-left px-3 py-2 text-sm text-[var(--zoom-text-primary)] hover:bg-[#252525] rounded-[var(--zoom-radius-button)] transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
