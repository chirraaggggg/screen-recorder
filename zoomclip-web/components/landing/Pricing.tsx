'use client';

interface FeatureItem {
  included: boolean;
  text: string;
}

function CheckIcon() {
  return (
    <span style={{ color: 'var(--green)', marginRight: 8 }}>✓</span>
  );
}

function XIcon() {
  return (
    <span style={{ color: 'var(--muted)', marginRight: 8 }}>✗</span>
  );
}

function Feature({ included, text }: FeatureItem) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, marginBottom: 8 }}>
      {included ? <CheckIcon /> : <XIcon />}
      <span style={{ color: included ? 'var(--text)' : 'var(--muted)' }}>{text}</span>
    </div>
  );
}

export function Pricing() {
  const freeFeatures: FeatureItem[] = [
    { included: true, text: '5 exports per month' },
    { included: true, text: 'Auto-zoom on every click' },
    { included: true, text: 'Spring physics animations' },
    { included: true, text: 'Basic backgrounds' },
    { included: true, text: 'MP4 export' },
    { included: true, text: '720p resolution' },
    { included: false, text: 'Custom watermark removal' },
    { included: false, text: '1080p / 4K export' },
    { included: false, text: 'Unlimited exports' },
  ];

  const proFeatures: FeatureItem[] = [
    { included: true, text: 'Unlimited exports' },
    { included: true, text: 'No watermark' },
    { included: true, text: '1080p + 4K export' },
    { included: true, text: 'All backgrounds' },
    { included: true, text: 'Custom watermark' },
    { included: true, text: 'Spring + snappy + instant speeds' },
    { included: true, text: 'Priority export queue' },
  ];

  return (
    <section
      id="pricing"
      style={{
        padding: '120px 0',
        maxWidth: 900,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 8,
        }}
      >
        Simple pricing
      </h2>
      <p
        style={{
          fontSize: 16,
          color: 'var(--muted)',
          marginBottom: 60,
        }}
      >
        Start free. Upgrade when you need more.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 24,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: '0 24px',
        }}
      >
        {/* FREE card */}
        <div
          style={{
            width: 420,
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              $0
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>/month</span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              marginBottom: 24,
            }}
          >
            Perfect for indie hackers and small projects
          </p>

          <div style={{ marginBottom: 24 }}>
            {freeFeatures.map((f, i) => (
              <Feature key={i} {...f} />
            ))}
          </div>

          <button
            style={{
              width: '100%',
              padding: '12px 0',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            Get started free
          </button>
        </div>

        {/* PRO card */}
        <div
          style={{
            width: 420,
            background: 'linear-gradient(180deg, rgba(52,211,116,0.04) 0%, transparent 100%)',
            border: '1px solid var(--green)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'left',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--green)',
              color: 'var(--bg)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              padding: '4px 12px',
              borderRadius: '0 0 4px 4px',
              textTransform: 'uppercase',
            }}
          >
            MOST POPULAR
          </div>

          <div style={{ marginBottom: 8, marginTop: 8 }}>
            <span
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              $15
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)', marginLeft: 4 }}>/month</span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              marginBottom: 24,
            }}
          >
            For serious founders and product teams
          </p>

          <div style={{ marginBottom: 24 }}>
            {proFeatures.map((f, i) => (
              <Feature key={i} {...f} />
            ))}
          </div>

          <a
            href="https://chromewebstore.google.com/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 0',
              backgroundColor: 'var(--green)',
              color: 'var(--bg)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Get Pro →
          </a>
        </div>
      </div>
    </section>
  );
}
