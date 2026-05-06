'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { ExportModal } from './ExportModal';

export function Toolbar() {
  const {
    videoFile,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    currentTime,
    videoDuration,
  } = useEditorStore();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(videoDuration, currentTime + 5));
  };

  const handlePrevEvent = () => {
    // Skip to start
    setCurrentTime(0);
  };

  const handleNextEvent = () => {
    // Skip to end
    setCurrentTime(videoDuration);
  };

  return (
    <>
      <div
        style={{
          height: 48,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          backgroundColor: 'var(--panel)',
        }}
      >
        {/* Left: Back + Logo + Filename */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--muted)',
              textDecoration: 'none',
              fontSize: 13,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            ← Back
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--green)',
                boxShadow: '0 0 10px rgba(52,211,116,0.7)',
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>ZoomClip</span>
          </div>

          {videoFile && (
            <>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--muted)',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={videoFile.name}
              >
                {videoFile.name}
              </span>
            </>
          )}
        </div>

        {/* Center: Play Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handlePrevEvent}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 16,
              padding: '4px 8px',
            }}
            title="Skip to start (Home)"
          >
            ⏮
          </button>
          <button
            onClick={handleSkipBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 16,
              padding: '4px 8px',
            }}
            title="Skip back 5s (←)"
          >
            ⏪
          </button>
          <button
            onClick={handlePlayPause}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--panel2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={handleSkipForward}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 16,
              padding: '4px 8px',
            }}
            title="Skip forward 5s (→)"
          >
            ⏩
          </button>
          <button
            onClick={handleNextEvent}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 16,
              padding: '4px 8px',
            }}
            title="Skip to end (End)"
          >
            ⏭
          </button>
        </div>

        {/* Right: Export Button */}
        <button
          onClick={() => setIsExportOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Export ▾
        </button>
      </div>

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </>
  );
}
