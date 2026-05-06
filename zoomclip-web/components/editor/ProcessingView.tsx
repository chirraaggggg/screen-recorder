'use client';

import { useEditorStore } from '@/store/editor-store';

export function ProcessingView() {
  const { processing } = useEditorStore();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 64,
          height: 64,
          marginBottom: 32,
        }}
      >
        <svg viewBox="0 0 64 64" style={{ width: '100%', height: '100%' }}>
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="var(--panel2)"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="var(--green)"
            strokeWidth="4"
            strokeDasharray="60 120"
            strokeLinecap="round"
            style={{
              transformOrigin: 'center',
              animation: 'spin 1s linear infinite',
            }}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 32 32"
              to="360 32 32"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <h2
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--text)',
          marginBottom: 8,
        }}
      >
        Applying zoom effects...
      </h2>

      <p
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          marginBottom: 32,
        }}
      >
        Processing in your browser — no upload needed
      </p>

      {/* Progress bar */}
      <div
        style={{
          width: 400,
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

      {/* Progress percentage */}
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
  );
}
