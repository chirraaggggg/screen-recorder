'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';

export function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const {
    currentTime,
    videoDuration,
    clickEvents,
    setCurrentTime,
    setIsPlaying,
  } = useEditorStore();

  const scrubberPosition = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  const calculateTimeFromMouse = useCallback((clientX: number) => {
    const bar = timelineRef.current;
    if (!bar || videoDuration === 0) return 0;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left - 16, rect.width - 32));
    const percentage = x / (rect.width - 32);
    return percentage * videoDuration;
  }, [videoDuration]);

  const handleBarClick = (e: React.MouseEvent) => {
    const time = calculateTimeFromMouse(e.clientX);
    setCurrentTime(time);
  };

  const handleScrubberMouseDown = () => {
    setIsDragging(true);
    setIsPlaying(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const time = calculateTimeFromMouse(e.clientX);
        setCurrentTime(time);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateTimeFromMouse, setCurrentTime, setIsPlaying]);

  const formatTime = (timeMs: number) => {
    const secs = Math.floor(timeMs / 1000);
    const ms = Math.floor((timeMs % 1000) / 100);
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}.${ms}`;
  };

  const handleClickMarkerClick = (timestamp: number) => {
    setCurrentTime(timestamp / 1000);
  };

  // Generate time markers every 2 seconds
  const timeMarkers = [];
  if (videoDuration > 0) {
    for (let t = 0; t <= videoDuration; t += 2) {
      timeMarkers.push(t);
    }
  }

  return (
    <div
      ref={timelineRef}
      style={{
        height: 48,
        borderTop: '1px solid var(--border)',
        position: 'relative',
        backgroundColor: 'var(--bg)',
        padding: '0 16px',
      }}
    >
      {/* Track */}
      <div
        style={{
          height: 4,
          backgroundColor: 'var(--panel2)',
          borderRadius: 2,
          position: 'absolute',
          top: '50%',
          left: 16,
          right: 16,
          transform: 'translateY(-50%)',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: 4,
            backgroundColor: 'var(--green)',
            borderRadius: 2,
            width: `${scrubberPosition}%`,
          }}
        />
      </div>

      {/* Scrubber */}
      <div
        onMouseDown={handleScrubberMouseDown}
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: '50%',
          transform: `translateY(-50%) translateX(-50%)`,
          left: `calc(16px + (100% - 32px) * ${scrubberPosition / 100})`,
          cursor: isDragging ? 'grabbing' : 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}
      />

      {/* Time markers */}
      {timeMarkers.map((t) => (
        <div
          key={t}
          style={{
            position: 'absolute',
            bottom: 4,
            left: `calc(16px + (100% - 32px) * ${(t / videoDuration)})`,
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {Math.floor(t / 60)}:{(t % 60).toString().padStart(2, '0')}
        </div>
      ))}

      {/* Click markers */}
      {clickEvents.map((event, index) => {
        const left = videoDuration > 0
          ? (event.timestamp / (videoDuration * 1000)) * 100
          : 0;

        return (
          <div
            key={index}
            onClick={() => handleClickMarkerClick(event.timestamp)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              position: 'absolute',
              top: '50%',
              left: `calc(16px + (100% - 32px) * ${left / 100})`,
              transform: 'translate(-50%, -50%) rotate(45deg)',
              width: 8,
              height: 8,
              backgroundColor: '#f59e0b',
              cursor: 'pointer',
            }}
          >
            {hoveredIndex === index && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%) translateY(-4px)',
                  backgroundColor: 'var(--panel2)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                }}
              >
                Click at {formatTime(event.timestamp)} — {event.target}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
