'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditorStore } from '@/store/editor-store';
import type { ClickEvent } from '@/lib/types';
import { Toolbar } from '@/components/editor/Toolbar';
import { VideoCanvas } from '@/components/editor/VideoCanvas';
import { Timeline } from '@/components/editor/Timeline';
import { ZoomEventsList } from '@/components/editor/ZoomEventsList';
import { SettingsPanel } from '@/components/editor/SettingsPanel';
import { UploadZone } from '@/components/editor/UploadZone';
import { ProcessingView } from '@/components/editor/ProcessingView';
import { ExportModal } from '@/components/editor/ExportModal';
import { generateZoomTimeline } from '@/lib/zoom-engine';
import { Slider } from '@/components/ui/Slider';
import { Dropdown } from '@/components/ui/Dropdown';

// Toast types
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function EditorPage() {
  const store = useEditorStore();
  const {
    editorState,
    videoFile,
    videoUrl,
    videoDuration,
    videoWidth,
    videoHeight,
    currentTime,
    isPlaying,
    clickEvents,
    zoom,
    zoomFrames,
    processing,
    setVideo,
    setClickEvents,
    setCurrentTime,
    setIsPlaying,
    setZoomFrames,
    setProcessing,
    reset,
  } = store;

  // Local state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [globalZoomLevel, setGlobalZoomLevel] = useState(zoom.level);
  const [globalSpeed, setGlobalSpeed] = useState(zoom.speed);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Refs
  const exportModalShownRef = useRef(false);

  // Toast helpers
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Listen for ZOOMCLIP_CLICKS messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ZOOMCLIP_CLICKS' && Array.isArray(event.data.clickEvents)) {
        // Normalize events to include required screenWidth/screenHeight
        const normalizedEvents = event.data.clickEvents.map((e: Partial<ClickEvent> & { timestamp?: number; x?: number; y?: number; target?: string }) => ({
          timestamp: e.timestamp ?? 0,
          x: e.x ?? 0,
          y: e.y ?? 0,
          target: e.target ?? 'unknown',
          screenWidth: e.screenWidth ?? 1920,
          screenHeight: e.screenHeight ?? 1080,
        }));
        setClickEvents(normalizedEvents);
        showToast(`${normalizedEvents.length} clicks captured!`, 'success');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setClickEvents, showToast]);

  // Auto-generate zoom frames when clickEvents or video changes
  useEffect(() => {
    if (videoFile && clickEvents.length > 0 && zoomFrames.length === 0) {
      const frames = generateZoomTimeline(clickEvents, zoom, videoDuration * 1000, 60);
      setZoomFrames(frames);
    }
  }, [videoFile, clickEvents, zoom, videoDuration, zoomFrames.length, setZoomFrames]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime(Math.min(videoDuration, currentTime + 5));
      } else if (e.code === 'Escape') {
        setIsExportOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, currentTime, videoDuration, setIsPlaying, setCurrentTime]);

  // Handle processing complete
  useEffect(() => {
    if (processing.status === 'done' && processing.outputUrl && !exportModalShownRef.current) {
      exportModalShownRef.current = true;
      setIsExportOpen(true);
    }
  }, [processing.status, processing.outputUrl]);

  // Helper: format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle apply zoom effects
  async function handleApplyZoom() {
    if (!videoFile || clickEvents.length === 0) return

    setProcessing({ status: 'processing', message: 'Generating zoom timeline...' })

    // Run in next tick to not block UI
    await new Promise(r => setTimeout(r, 10))

    const frames = generateZoomTimeline(
      clickEvents,
      { ...zoom, level: globalZoomLevel, speed: globalSpeed },
      videoDuration * 1000,  // ms
      60
    )

    setZoomFrames(frames)
    setProcessing({ status: 'idle', progress: 0, outputUrl: null, message: '' })

    showToast('Zoom effects applied — ready to export!', 'success')
  }

  // Handle download
  const handleDownload = () => {
    if (processing.outputUrl) {
      const a = document.createElement('a');
      a.href = processing.outputUrl;
      a.download = `zoomclip-export-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Handle edit again
  const handleEditAgain = () => {
    exportModalShownRef.current = false;
    setProcessing({ status: 'idle', progress: 0, outputUrl: null, message: '' });
  };

  // Toast color helper
  const getToastColor = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'var(--green)';
      case 'error': return '#ef4444';
      case 'info': return '#3b82f6';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE: EMPTY
  // ═══════════════════════════════════════════════════════════════════════════
  if (editorState === 'empty') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Screen recording icon */}
        <svg
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          style={{ color: 'var(--muted)', marginBottom: 24 }}
        >
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--text)',
            marginBottom: 12,
          }}
        >
          Your recording will appear here
        </h1>

        <p
          style={{
            fontSize: 14,
            color: 'var(--muted)',
            maxWidth: 400,
            lineHeight: 1.6,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Open a website, click Record in the ZoomClip extension, use your product, then click Stop.
        </p>

        {/* Pulsing indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--green)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Waiting for recording...</span>
          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.2); }
            }
          `}</style>
        </div>

        {/* Separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 100, height: 1, backgroundColor: 'var(--border)' }} />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>or</span>
          <div style={{ width: 100, height: 1, backgroundColor: 'var(--border)' }} />
        </div>

        <UploadZone />

        {/* Toasts */}
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              padding: '12px 20px',
              backgroundColor: 'var(--panel)',
              border: `1px solid ${getToastColor(t.type)}`,
              borderLeft: `3px solid ${getToastColor(t.type)}`,
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              zIndex: 1000,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE: CLICKS-ONLY
  // ═══════════════════════════════════════════════════════════════════════════
  if (editorState === 'clicks-only') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Green banner */}
        <div
          style={{
            backgroundColor: 'rgba(52,211,116,0.08)',
            borderBottom: '1px solid rgba(52,211,116,0.2)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: 'var(--green)', fontSize: 14 }}>
            ✓ {clickEvents.length} clicks captured — now drop your recording below
          </span>
        </div>

        {/* Upload zone */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <UploadZone />

          <p
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              textAlign: 'center',
              marginBottom: 48,
            }}
          >
            Check your Downloads folder — your recording was just saved there
          </p>
        </div>

        {/* Toasts */}
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              position: 'fixed',
              bottom: 24 + toasts.findIndex(toast => toast.id === t.id) * 60,
              right: 24,
              padding: '12px 20px',
              backgroundColor: 'var(--panel)',
              border: `1px solid ${getToastColor(t.type)}`,
              borderLeft: `3px solid ${getToastColor(t.type)}`,
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              zIndex: 1000,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE: READY
  // ═══════════════════════════════════════════════════════════════════════════
  if (editorState === 'ready') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Row 1: Three columns */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT: Settings */}
          <div
            style={{
              width: 240,
              minWidth: 240,
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
              backgroundColor: 'var(--panel)',
            }}
          >
            {/* Video thumbnail strip */}
            {videoUrl && (
              <div
                style={{
                  height: 120,
                  backgroundColor: 'var(--panel2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <video
                  src={videoUrl}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}

            {/* File info */}
            {videoFile && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: 4,
                  }}
                  title={videoFile.name}
                >
                  {videoFile.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {formatTime(videoDuration)} • {videoWidth}x{videoHeight}
                </div>
              </div>
            )}

            <SettingsPanel />
          </div>

          {/* CENTER: Canvas + Timeline */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Toolbar />
            <VideoCanvas />
            <Timeline />
          </div>

          {/* RIGHT: Events + Global Zoom */}
          <div
            style={{
              width: 240,
              minWidth: 240,
              borderLeft: '1px solid var(--border)',
              overflowY: 'auto',
              backgroundColor: 'var(--panel)',
            }}
          >
            <ZoomEventsList />

            {/* Divider with label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                }}
              >
                Global Zoom
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border)' }} />
            </div>

            {/* Global zoom settings */}
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ marginBottom: 16 }}>
                <Slider
                  value={globalZoomLevel}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={setGlobalZoomLevel}
                  label="Zoom Level"
                  formatValue={(v) => `${v.toFixed(1)}x`}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <Dropdown
                  value={globalSpeed}
                  options={[
                    { value: 'smooth', label: 'Smooth' },
                    { value: 'snappy', label: 'Snappy' },
                    { value: 'instant', label: 'Instant' },
                  ]}
                  onChange={(v) => setGlobalSpeed(v as 'smooth' | 'snappy' | 'instant')}
                  label="Speed"
                />
              </div>

              <button
                onClick={handleApplyZoom}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  backgroundColor: 'var(--green)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply Zoom Effects
              </button>
            </div>
          </div>
        </div>

        <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

        {/* Toasts */}
        {toasts.map((t, i) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              position: 'fixed',
              bottom: 24 + i * 60,
              right: 24,
              padding: '12px 20px',
              backgroundColor: 'var(--panel)',
              border: `1px solid ${getToastColor(t.type)}`,
              borderLeft: `3px solid ${getToastColor(t.type)}`,
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              zIndex: 1000,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE: PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════
  if (editorState === 'processing') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* LEFT: Settings */}
        <div
          style={{
            width: 240,
            minWidth: 240,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            backgroundColor: 'var(--panel)',
          }}
        >
          {videoUrl && (
            <div
              style={{
                height: 120,
                backgroundColor: 'var(--panel2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                opacity: 0.5,
              }}
            >
              <video
                src={videoUrl}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}
          <SettingsPanel />
        </div>

        {/* CENTER: Processing view */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ProcessingView />
        </div>

        {/* RIGHT: Events */}
        <div
          style={{
            width: 240,
            minWidth: 240,
            borderLeft: '1px solid var(--border)',
            overflowY: 'auto',
            backgroundColor: 'var(--panel)',
          }}
        >
          <ZoomEventsList />
        </div>

        {/* Toasts */}
        {toasts.map((t, i) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              position: 'fixed',
              bottom: 24 + i * 60,
              right: 24,
              padding: '12px 20px',
              backgroundColor: 'var(--panel)',
              border: `1px solid ${getToastColor(t.type)}`,
              borderLeft: `3px solid ${getToastColor(t.type)}`,
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              zIndex: 1000,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE: DONE
  // ═══════════════════════════════════════════════════════════════════════════
  if (editorState === 'done') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        {/* Green banner */}
        <div
          style={{
            backgroundColor: 'rgba(52,211,116,0.08)',
            border: '1px solid rgba(52,211,116,0.2)',
            borderRadius: 8,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 32,
          }}
        >
          <span style={{ color: 'var(--green)', fontSize: 14 }}>
            ✓ Your video is ready to download
          </span>
        </div>

        {/* Video preview */}
        {processing.outputUrl && (
          <video
            src={processing.outputUrl}
            controls
            style={{
              maxWidth: '80%',
              maxHeight: '60vh',
              borderRadius: 12,
              marginBottom: 32,
            }}
          />
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--green)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ⬇ Download MP4
          </button>

          <button
            onClick={handleEditAgain}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Edit again
          </button>

          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            New recording
          </button>
        </div>

        {/* Toasts */}
        {toasts.map((t, i) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              position: 'fixed',
              bottom: 24 + i * 60,
              right: 24,
              padding: '12px 20px',
              backgroundColor: 'var(--panel)',
              border: `1px solid ${getToastColor(t.type)}`,
              borderLeft: `3px solid ${getToastColor(t.type)}`,
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              zIndex: 1000,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    );
  }

  // Fallback
  return null;
}
