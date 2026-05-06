'use client';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
  formatValue?: (v: number) => string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit,
  formatValue,
}: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : `${value}${unit || ''}`;
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ width: '100%' }}>
      {(label || unit !== undefined) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          {label && (
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{displayValue}</span>
        </div>
      )}
      <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: 'var(--panel3)',
            borderRadius: 2,
          }}
        />
        {/* Track fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${progress}%`,
            height: 4,
            backgroundColor: 'var(--green)',
            borderRadius: 2,
          }}
        />
        {/* Range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            width: '100%',
            height: 16,
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${progress}% - 8px)`,
            width: 16,
            height: 16,
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
