'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, label, size = 'md' }: ToggleProps) {
  const trackWidth = size === 'sm' ? 28 : 36;
  const trackHeight = size === 'sm' ? 16 : 20;
  const thumbSize = size === 'sm' ? 12 : 14;
  const thumbOffset = size === 'sm' ? 2 : 3;
  const thumbTranslate = size === 'sm' ? 12 : 16;

  const toggle = () => onChange(!checked);

  const content = (
    <div
      onClick={toggle}
      style={{
        width: trackWidth,
        height: trackHeight,
        backgroundColor: checked ? 'var(--green)' : 'var(--panel3)',
        borderRadius: 999,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      }}
    >
      <div
        style={{
          width: thumbSize,
          height: thumbSize,
          backgroundColor: 'white',
          borderRadius: '50%',
          position: 'absolute',
          top: thumbOffset,
          left: thumbOffset,
          transform: checked ? `translateX(${thumbTranslate}px)` : 'translateX(0)',
          transition: 'transform 0.15s ease',
        }}
      />
    </div>
  );

  if (label) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          cursor: 'pointer',
        }}
        onClick={toggle}
      >
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
        {content}
      </div>
    );
  }

  return content;
}
