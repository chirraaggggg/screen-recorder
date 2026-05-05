"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ClickEvent } from "../../lib/types";

interface TimelineProps {
  duration: number;
  currentTime: number;
  events: ClickEvent[];
  onSeek: (time: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ duration, currentTime, events, onSeek }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<ClickEvent | null>(null);

  const calculateTimeFromMouseEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current || duration === 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  const handlePointerDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    onSeek(calculateTimeFromMouseEvent(e));
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      if (isDragging) {
        onSeek(calculateTimeFromMouseEvent(e));
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [isDragging, onSeek, calculateTimeFromMouseEvent]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate ticks every 2 seconds
  const ticks = [];
  for (let t = 0; t <= duration; t += 2) {
    ticks.push(t);
  }

  return (
    <div 
      className="relative w-full h-[56px] bg-[var(--zoom-surface)] border-t border-[var(--zoom-border)] shrink-0 select-none cursor-pointer overflow-hidden"
      ref={containerRef}
      onMouseDown={handlePointerDown}
    >
      {/* Time Ticks */}
      <div className="absolute top-1 w-full h-full pointer-events-none">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute h-full border-l border-[var(--zoom-border)] flex flex-col"
            style={{ left: `${(t / duration) * 100}%` }}
          >
            <span className="text-[10px] text-[var(--zoom-text-secondary)] ml-1 -mt-0.5">
              0:{t.toString().padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>

      {/* Progress Track */}
      <div 
        className="absolute bottom-0 h-1 bg-[var(--zoom-accent)]/80 pointer-events-none"
        style={{ width: `${progressPercent}%`, transition: isDragging ? 'none' : 'width 100ms linear' }}
      />

      {/* Playhead / Scrubber */}
      <div 
        className="absolute top-0 bottom-0 w-px bg-[var(--zoom-accent)] pointer-events-none flex flex-col items-center"
        style={{ left: `${progressPercent}%`, transition: isDragging ? 'none' : 'left 100ms linear' }}
      >
        <div className="w-2.5 h-2.5 bg-[var(--zoom-accent)] -mt-1 rounded-sm shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
      </div>

      {/* Click Events Markers */}
      {events.map((ev) => {
        const evTimeS = ev.timestamp / 1000;
        const leftPercent = duration > 0 ? (evTimeS / duration) * 100 : 0;
        const isPast = currentTime > evTimeS && currentTime < evTimeS + 1; // simple active state

        return (
          <div
            key={ev.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
            style={{ left: `${leftPercent}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onSeek(evTimeS);
            }}
            onMouseEnter={() => setHoveredEvent(ev)}
            onMouseLeave={() => setHoveredEvent(null)}
          >
            <div className={`w-3 h-3 rotate-45 transform transition-all duration-200 cursor-pointer ${
              isPast 
                ? 'bg-[var(--zoom-text-primary)] shadow-[0_0_10px_rgba(255,255,255,0.8)] scale-110' 
                : 'bg-[var(--zoom-accent)] hover:bg-[#818cf8] hover:scale-125'
            }`} />
            
            {/* Tooltip */}
            {hoveredEvent?.id === ev.id && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--zoom-surface-light)] border border-[var(--zoom-border)] px-2 py-1 rounded shadow-lg text-[10px] font-mono text-[var(--zoom-text-primary)] whitespace-nowrap z-10 pointer-events-none">
                0:{Math.floor(evTimeS).toString().padStart(2, '0')}.{Math.floor(((evTimeS % 1) * 100)).toString().padStart(2, '0')}
                <br/>
                x:{ev.x} y:{ev.y}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
