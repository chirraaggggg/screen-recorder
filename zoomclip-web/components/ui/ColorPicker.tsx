'use client';

import { useRef } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const content = (
    <>
      <button
        onClick={handleClick}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: value,
          border: '1px solid var(--border)',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Pick color"
      />
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
        }}
      />
    </>
  );

  if (label) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
        {content}
      </div>
    );
  }

  return <div style={{ position: 'relative' }}>{content}</div>;
}
