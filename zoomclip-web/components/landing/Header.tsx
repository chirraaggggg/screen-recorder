'use client';

export function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        height: 56,
        zIndex: 100,
        backgroundColor: 'rgba(17,17,17,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--green)',
              boxShadow: '0 0 10px rgba(52,211,116,0.7)',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            ZoomClip
          </span>
        </a>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a
            href="#features"
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Features
          </a>
          <a
            href="#pricing"
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Pricing
          </a>
          <a
            href="#changelog"
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Changelog
          </a>
        </nav>

        {/* CTA */}
        <a
          href="https://chromewebstore.google.com/"
          target="_blank"
          rel="noreferrer"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Get Extension →
        </a>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </header>
  );
}
