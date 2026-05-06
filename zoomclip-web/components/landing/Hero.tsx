'use client';

export function Hero() {
  return (
    <section
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 820, width: '100%' }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(52,211,116,0.08)',
            border: '1px solid rgba(52,211,116,0.2)',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 13,
            color: 'var(--green)',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'var(--green)',
            }}
          />
          New — Auto-zoom on every click
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            color: 'var(--text)',
            marginBottom: 24,
          }}
        >
          Record. Click. Ship.
        </h1>

        {/* Sub */}
        <p
          style={{
            fontSize: 18,
            color: 'var(--muted)',
            maxWidth: 480,
            lineHeight: 1.7,
            margin: '0 auto 40px',
          }}
        >
          The most beautiful screen recordings.
          <br />
          Auto-zoom on every click. Any OS. Free.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
          <a
            href="https://chromewebstore.google.com/"
            target="_blank"
            rel="noreferrer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              borderRadius: 999,
              padding: '14px 28px',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'white',
              }}
            />
            Get ZoomClip Free
          </a>
          <a
            href="#features"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text)',
              borderRadius: 999,
              padding: '14px 28px',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            See example →
          </a>
        </div>

        {/* Social proof */}
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 60 }}>
          ★★★★★ Loved by indie hackers worldwide
        </p>

        {/* Hero Visual */}
        <div style={{ position: 'relative' }}>
          {/* Ambient glow */}
          <div
            style={{
              position: 'absolute',
              bottom: -100,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 600,
              height: 200,
              background: 'radial-gradient(ellipse, rgba(255,68,68,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Card */}
          <div
            style={{
              borderRadius: 16,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--panel)',
              overflow: 'hidden',
              maxWidth: 820,
              margin: '0 auto',
            }}
          >
            {/* Browser chrome */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#ff5f57',
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#febc2e',
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#28c840',
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  backgroundColor: 'var(--panel2)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  color: 'var(--muted)',
                  textAlign: 'left',
                }}
              >
                zoomclip.app
              </div>
            </div>

            {/* Content area with animation */}
            <div
              style={{
                aspectRatio: '16/10',
                backgroundColor: 'var(--panel2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* Fake screenshot content */}
              <div
                style={{
                  width: '70%',
                  height: '60%',
                  borderRadius: 8,
                  backgroundColor: 'var(--panel)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    width: '40%',
                    height: 16,
                    backgroundColor: 'var(--panel3)',
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    width: '70%',
                    height: 12,
                    backgroundColor: 'var(--panel3)',
                    borderRadius: 4,
                  }}
                />
                <div
                  style={{
                    width: '50%',
                    height: 12,
                    backgroundColor: 'var(--panel3)',
                    borderRadius: 4,
                  }}
                />
              </div>

              {/* Animated click indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '30%',
                  right: '35%',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '2px solid var(--green)',
                  animation: 'zoomPulse 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes zoomPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
