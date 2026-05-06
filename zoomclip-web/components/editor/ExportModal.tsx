'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import type { Resolution, ExportFormat, ExportQuality, ExportFps } from '@/lib/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { processing, setProcessing, exportSettings, setExportSettings } = useEditorStore();
  const [resolution, setResolution] = useState<Resolution>(exportSettings.resolution);
  const [format, setFormat] = useState<ExportFormat>(exportSettings.format);
  const [quality, setQuality] = useState<ExportQuality>(exportSettings.quality);
  const [fps, setFps] = useState<ExportFps>(exportSettings.fps);
  const [includeAudio, setIncludeAudio] = useState(exportSettings.includeAudio);

  const isPro = false; // TODO: Check pro status

  if (!isOpen) return null;

  const handleExport = () => {
    setExportSettings({ resolution, format, quality, fps, includeAudio });
    setProcessing({ status: 'processing', progress: 0, message: 'Applying zoom effects...' });
  };

  const handleCancel = () => {
    if (processing.status === 'processing') return;
    onClose();
  };

  const handleDownload = () => {
    if (processing.outputUrl) {
      const a = document.createElement('a');
      a.href = processing.outputUrl;
      a.download = `zoomclip-export.${format}`;
      a.click();
    }
  };

  const handleExportAgain = () => {
    setProcessing({ status: 'idle', progress: 0, outputUrl: null, message: '' });
  };

  // Render processing state
  if (processing.status === 'processing') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: 480,
            backgroundColor: 'var(--panel)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '3px solid var(--panel2)',
              borderTopColor: 'var(--green)',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>

          <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
            Applying zoom effects...
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            Processing in your browser — no upload needed
          </p>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: 8,
              backgroundColor: 'var(--panel2)',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: `${processing.progress}%`,
                height: '100%',
                backgroundColor: 'var(--green)',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: 'var(--green)',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 8,
            }}
          >
            {processing.progress}%
          </div>

          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            Frame {processing.frame} of {processing.totalFrames}
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            Estimated time: {processing.eta}s remaining
          </p>

          <p style={{ fontSize: 13, color: '#f59e0b' }}>
            ⚠️ Do not close this tab
          </p>
        </div>
      </div>
    );
  }

  // Render done state
  if (processing.status === 'done' && processing.outputUrl) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: 480,
            backgroundColor: 'var(--panel)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 32,
            }}
          >
            ✓
          </div>

          <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
            Your video is ready!
          </h3>

          <button
            onClick={handleDownload}
            style={{
              width: '100%',
              padding: '14px 0',
              backgroundColor: 'var(--green)',
              color: 'var(--bg)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              marginBottom: 12,
            }}
          >
            ⬇ Download {format.toUpperCase()}
          </button>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleExportAgain}
              style={{
                flex: 1,
                padding: '12px 0',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Export Again
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 0',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render export options
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: 480,
          backgroundColor: 'var(--panel)',
          borderRadius: 16,
          padding: 32,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 24 }}>
          Export Video
        </h2>

        {/* Resolution */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'block' }}>
            Resolution
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['720p', '1080p', '4k'] as Resolution[]).map((res) => (
              <label
                key={res}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: res === '4k' && !isPro ? 'var(--muted)' : 'var(--text)',
                  cursor: res === '4k' && !isPro ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="resolution"
                  checked={resolution === res}
                  onChange={() => setResolution(res)}
                  disabled={res === '4k' && !isPro}
                  style={{ accentColor: 'var(--green)' }}
                />
                {res}
              </label>
            ))}
          </div>
          {resolution === '4k' && !isPro && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Pro plan required</p>
          )}
        </div>

        {/* Format */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'block' }}>
            Format
          </label>
          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="format"
                checked={format === 'mp4'}
                onChange={() => setFormat('mp4')}
                style={{ accentColor: 'var(--green)' }}
              />
              MP4
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="format"
                checked={format === 'gif'}
                onChange={() => setFormat('gif')}
                style={{ accentColor: 'var(--green)' }}
              />
              GIF
            </label>
          </div>
          {format === 'gif' && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Larger file size, no audio</p>
          )}
        </div>

        {/* Quality */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'block' }}>
            Quality
          </label>
          <Slider
            value={['low', 'medium', 'high', 'lossless'].indexOf(quality)}
            min={0}
            max={3}
            step={1}
            onChange={(v) => setQuality(['low', 'medium', 'high', 'lossless'][v] as ExportQuality)}
            formatValue={(v) => ['Low', 'Medium', 'High', 'Lossless'][v]}
          />
        </div>

        {/* FPS */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'block' }}>
            FPS
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setFps(30)}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: fps === 30 ? 'var(--green)' : 'var(--panel2)',
                color: fps === 30 ? 'var(--bg)' : 'var(--text)',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              30fps
            </button>
            <button
              onClick={() => setFps(60)}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: fps === 60 ? 'var(--green)' : 'var(--panel2)',
                color: fps === 60 ? 'var(--bg)' : 'var(--text)',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              60fps
            </button>
          </div>
          {fps === 60 && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Smoother but larger file</p>
          )}
        </div>

        {/* Audio toggle */}
        <div style={{ marginBottom: 24 }}>
          <Toggle
            checked={includeAudio && format === 'mp4'}
            onChange={(v) => setIncludeAudio(v)}
            label="Include audio"
          />
          {format === 'gif' && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Audio disabled for GIF</p>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '10px 24px',
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
            Export →
          </button>
        </div>
      </div>
    </div>
  );
}
