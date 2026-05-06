'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Slider } from '@/components/ui/Slider';

export function ZoomEventsList() {
  const {
    clickEvents,
    removeClickEvent,
    setCurrentTime,
    currentTime,
    addClickEvent,
  } = useEditorStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);

  const formatTime = (ms: number): string => {
    const secs = Math.floor(ms / 1000);
    const millis = Math.floor((ms % 1000) / 100);
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}.${millis}`;
  };

  const handleEventClick = (timestamp: number) => {
    setCurrentTime(timestamp / 1000);
  };

  const isSelected = (timestamp: number): boolean => {
    const timeMs = currentTime * 1000;
    return Math.abs(timeMs - timestamp) < 500;
  };

  const handleAddClick = () => {
    setIsAddingMode(!isAddingMode);
  };

  return (
    <div
      style={{
        width: 280,
        backgroundColor: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              textTransform: 'uppercase',
            }}
          >
            ZOOM EVENTS
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--green)',
              backgroundColor: 'rgba(52,211,116,0.1)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            {clickEvents.length}
          </span>
        </div>
        <button
          onClick={handleAddClick}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: isAddingMode ? 'var(--green)' : 'var(--text)',
            backgroundColor: isAddingMode ? 'rgba(52,211,116,0.1)' : 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {clickEvents.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 13,
            }}
          >
            No clicks detected yet. Use the extension to record, or click '+ Add' to place zoom
            points manually.
          </div>
        ) : (
          clickEvents.map((event, index) => (
            <div
              key={index}
              onClick={() => handleEventClick(event.timestamp)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                backgroundColor: 'var(--panel2)',
                border: `1px solid ${isSelected(event.timestamp) ? 'var(--green)' : 'var(--border)'}`,
                borderLeft: `3px solid ${isSelected(event.timestamp) ? 'var(--green)' : '#f59e0b'}`,
                borderRadius: 8,
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text)',
                    fontFamily: 'monospace',
                  }}
                >
                  {formatTime(event.timestamp)}
                </span>
                {hoveredIndex === index && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClickEvent(index);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '2px 6px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                {event.target} • {event.x}, {event.y}
              </div>
              {/* Mini zoom slider per event */}
              <Slider
                value={1.8}
                min={1}
                max={3}
                step={0.1}
                onChange={() => {}}
                label="Zoom"
                formatValue={(v) => `${v.toFixed(1)}x`}
              />
            </div>
          ))
        )}
      </div>

      {/* Add button at bottom */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleAddClick}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px dashed var(--border)',
            borderRadius: 8,
            backgroundColor: 'transparent',
            color: 'var(--muted)',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--green)';
            e.currentTarget.style.color = 'var(--green)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--muted)';
          }}
        >
          + Add Zoom Point
        </button>
      </div>
    </div>
  );
}
