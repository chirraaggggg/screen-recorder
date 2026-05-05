"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClickEvent } from "../../lib/types";

interface ZoomEventListProps {
  events: ClickEvent[];
  onSeek: (time: number) => void;
  onDelete: (id: string) => void;
  onAddEvent: () => void;
}

export const ZoomEventList: React.FC<ZoomEventListProps> = ({ events, onSeek, onDelete, onAddEvent }) => {
  
  const formatTime = (timestampMs: number) => {
    const time = timestampMs / 1000;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--zoom-surface)] border-l border-[var(--zoom-border)] p-5 overflow-y-auto w-[300px] shrink-0">
      
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-semibold text-[var(--zoom-text-secondary)] uppercase tracking-wider">
          Zoom Events
        </h3>
        <span className="text-xs bg-[var(--zoom-surface-light)] px-2 py-1 rounded text-[var(--zoom-text-primary)] font-mono">
          {events.length}
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto editor-scrollbar pr-2 -mr-2">
        <AnimatePresence>
          {events.map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => onSeek(ev.timestamp / 1000)}
              className="relative group flex flex-col bg-[var(--zoom-surface-light)] border border-[var(--zoom-border)] rounded-[var(--zoom-radius-button)] p-3 cursor-pointer overflow-hidden transition-all duration-200 hover:bg-[#202020]"
            >
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--zoom-accent)]" />
              
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm font-medium text-[var(--zoom-text-primary)]">
                  {formatTime(ev.timestamp)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ev.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1"
                  title="Delete event"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <div className="text-xs text-[var(--zoom-text-secondary)] mt-1 font-mono">
                x: {ev.x} y: {ev.y}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {events.length === 0 && (
          <div className="text-center py-10 text-[var(--zoom-text-secondary)] text-sm italic">
            No events detected. Add one to start zooming.
          </div>
        )}
      </div>

      <div className="pt-4 mt-auto">
        <button
          onClick={onAddEvent}
          className="w-full py-2.5 flex items-center justify-center gap-2 border border-dashed border-[var(--zoom-border)] rounded-[var(--zoom-radius-button)] text-[var(--zoom-text-secondary)] hover:text-[var(--zoom-text-primary)] hover:border-[var(--zoom-text-secondary)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="text-sm font-medium">Add Event Here</span>
        </button>
      </div>

    </div>
  );
};
