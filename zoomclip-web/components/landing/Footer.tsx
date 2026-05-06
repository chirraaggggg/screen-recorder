'use client';

export function Footer() {
  const links = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: 'https://github.com', label: 'GitHub' },
    { href: '#', label: 'Privacy' },
    { href: '#', label: 'Terms' },
  ];

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '48px 0',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* Row 1 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px 24px',
          flexWrap: 'wrap',
          gap: 16,
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
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>ZoomClip</span>
        </a>

        {/* Links */}
        <nav style={{ display: 'flex', gap: 24 }}>
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontSize: 14,
                color: 'var(--muted)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Made with */}
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>Made with ❤️</div>
      </div>

      {/* Row 2 */}
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          © 2025 ZoomClip. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
