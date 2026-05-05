"use client";

import type { ClickEvent } from "@/lib/types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type ZoomEventsListProps = {
  clickEvents: ClickEvent[];
  onSeek: (timestampMs: number) => void;
  canExport: boolean;
  onExport: () => void;
};

export function ZoomEventsList({
  clickEvents,
  onSeek,
  canExport,
  onExport,
}: ZoomEventsListProps) {
  return (
    <div className="flex h-full flex-col rounded-card border border-cardBorder bg-panel p-4">
      <div className="text-sm font-semibold text-text">Zoom Events</div>

      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        {clickEvents.length === 0 ? (
          <div className="text-sm text-muted">Paste click events JSON to see markers.</div>
        ) : (
          <div className="space-y-2">
            {clickEvents.map((ev, idx) => (
              <button
                key={`${ev.timestamp}-${idx}`}
                type="button"
                className="w-full rounded-input border border-inputBorder bg-panel2 p-3 text-left hover:border-cardBorder"
                onClick={() => onSeek(ev.timestamp)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-text">
                    {formatTime(ev.timestamp / 1000)}
                  </div>
                  <div className="text-[11px] font-semibold text-muted">{ev.target}</div>
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  x: {Math.round(ev.x)} • y: {Math.round(ev.y)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!canExport}
        onClick={onExport}
        className={
          "mt-4 rounded-pill px-4 py-3 text-sm font-semibold " +
          (canExport
            ? "bg-green text-bg shadow-[0_0_10px_rgba(56,216,111,0.7)] hover:brightness-110 active:brightness-95"
            : "bg-panel2 text-muted border border-inputBorder cursor-not-allowed")
        }
      >
        Export MP4
      </button>
    </div>
  );
}
