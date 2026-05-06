'use client';

interface Step {
  number: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Install ZoomClip',
    description: 'One click from the Chrome Web Store. Free forever.',
  },
  {
    number: 2,
    title: 'Click Record',
    description: 'Open any website. Click the ZoomClip extension. Choose your tab.',
  },
  {
    number: 3,
    title: 'Use your product',
    description:
      'Navigate normally. Every click is secretly tracked with its timestamp and coordinates.',
  },
  {
    number: 4,
    title: 'Click Stop',
    description:
      'Your recording is saved. The editor opens automatically with all your clicks loaded.',
  },
  {
    number: 5,
    title: 'Export',
    description: 'Click Export. Your polished video downloads in seconds. Done.',
  },
];

export function HowItWorks() {
  return (
    <section style={{ padding: '120px 0', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
      <h2
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 60,
        }}
      >
        From recording to shipped in 5 steps
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, textAlign: 'left' }}>
        {steps.map((step, index) => (
          <div key={step.number} style={{ display: 'flex', gap: 20 }}>
            {/* Number badge + connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {step.number}
              </div>
              {index < steps.length - 1 && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 40,
                    backgroundColor: 'var(--border)',
                    marginTop: 12,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: index < steps.length - 1 ? 40 : 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 4,
                }}
              >
                {step.title}
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
