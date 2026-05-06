'use client';

function CursorSparkleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
      <path d="M16 11l4 1-1-4" />
    </svg>
  );
}

function GradientIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d374" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="url(#g1)" strokeWidth="1.5" />
      <rect x="6" y="6" width="12" height="12" rx="2" fill="url(#g1)" opacity="0.3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SpringIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 12c0-4 3-4 3-8s3-4 3-8 3 4 3 8-3 4-3 8" />
      <path d="M8 12c0 4 3 4 3 8s3 4 3 8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 28,
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ color: 'var(--green)', marginBottom: 16 }}>{icon}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: 14,
          color: 'var(--muted)',
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

export function Features() {
  const features = [
    {
      icon: <CursorSparkleIcon />,
      title: 'Auto-zoom on click',
      description:
        'Every mouse click automatically triggers a smooth spring-physics zoom into exactly where you clicked. No manual editing.',
    },
    {
      icon: <GradientIcon />,
      title: 'Beautiful backgrounds',
      description:
        'Wrap your recording in stunning wallpapers, gradients, or solid colors. Make it look like a professional product demo.',
    },
    {
      icon: <GlobeIcon />,
      title: 'Works on any OS',
      description:
        'Chrome extension. No desktop app needed. Mac, Windows, Linux — if you have Chrome, you have ZoomClip.',
    },
    {
      icon: <SpringIcon />,
      title: 'Spring physics',
      description:
        'Zoom animations use real spring physics — not linear easing. The result feels alive, not mechanical.',
    },
    {
      icon: <LockIcon />,
      title: 'Stays on device',
      description:
        'Your video never leaves your machine. All processing happens in your browser via WebAssembly. Zero server costs.',
    },
    {
      icon: <DownloadIcon />,
      title: 'Instant export',
      description:
        'Export to MP4 or GIF in seconds. 720p free, 1080p and 4K on Pro. No waiting for server renders.',
    },
  ];

  return (
    <section id="features" style={{ padding: '120px 0', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--green)',
            letterSpacing: '0.1em',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          FEATURES
        </div>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          Everything you need to ship beautiful demos
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          padding: '0 24px',
        }}
      >
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
