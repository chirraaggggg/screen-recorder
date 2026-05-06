'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@/components/ui/Slider';
import { Dropdown } from '@/components/ui/Dropdown';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { generateZoomTimeline } from '@/lib/zoom-engine';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {title}
        <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function SettingsPanel() {
  const {
    background,
    layout,
    zoom,
    cursor,
    clickEvents,
    videoDuration,
    setBackground,
    setLayout,
    setZoom,
    setCursor,
    setZoomFrames,
  } = useEditorStore();

  const handleApplyToAll = () => {
    const frames = generateZoomTimeline(
      clickEvents,
      zoom,
      videoDuration * 1000,
      60
    );
    setZoomFrames(frames);
  };

  return (
    <div
      style={{
        width: 280,
        backgroundColor: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
      }}
    >
      {/* BACKGROUND Section */}
      <Section title="Background">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="bg"
              checked={background.type === 'wallpaper'}
              onChange={() => setBackground({ type: 'wallpaper' })}
              style={{ accentColor: 'var(--green)' }}
            />
            Wallpaper (blurred video frame)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="bg"
              checked={background.type === 'color'}
              onChange={() => setBackground({ type: 'color' })}
              style={{ accentColor: 'var(--green)' }}
            />
            Color
            {background.type === 'color' && (
              <ColorPicker
                value={background.color}
                onChange={(color) => setBackground({ color })}
              />
            )}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="bg"
              checked={background.type === 'gradient'}
              onChange={() => setBackground({ type: 'gradient' })}
              style={{ accentColor: 'var(--green)' }}
            />
            Gradient
          </label>
          {background.type === 'gradient' && (
            <div style={{ display: 'flex', gap: 8, paddingLeft: 24 }}>
              <ColorPicker
                value={background.gradient[0]}
                onChange={(color) => setBackground({ gradient: [color, background.gradient[1]] })}
              />
              <ColorPicker
                value={background.gradient[1]}
                onChange={(color) => setBackground({ gradient: [background.gradient[0], color] })}
              />
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="bg"
              checked={background.type === 'none'}
              onChange={() => setBackground({ type: 'none' })}
              style={{ accentColor: 'var(--green)' }}
            />
            None
          </label>
        </div>
      </Section>

      {/* LAYOUT Section */}
      <Section title="Layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Slider
            value={layout.padding}
            min={0}
            max={80}
            step={4}
            onChange={(v) => setLayout({ padding: v })}
            label="Padding"
            unit="px"
          />
          <Slider
            value={layout.borderRadius}
            min={0}
            max={30}
            step={1}
            onChange={(v) => setLayout({ borderRadius: v })}
            label="Corner Radius"
            unit="px"
          />
          <Toggle
            checked={layout.shadow}
            onChange={(v) => setLayout({ shadow: v })}
            label="Shadow"
          />
          {layout.shadow && (
            <>
              <Slider
                value={layout.shadowBlur}
                min={0}
                max={80}
                step={4}
                onChange={(v) => setLayout({ shadowBlur: v })}
                label="Blur"
                unit="px"
              />
              <Slider
                value={layout.shadowOpacity}
                min={0}
                max={100}
                step={5}
                onChange={(v) => setLayout({ shadowOpacity: v / 100 })}
                label="Opacity"
                unit="%"
              />
            </>
          )}
        </div>
      </Section>

      {/* ZOOM Section */}
      <Section title="Zoom (Global)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Slider
            value={zoom.level}
            min={1.0}
            max={3.0}
            step={0.1}
            onChange={(v) => setZoom({ level: v })}
            label="Zoom Level"
            formatValue={(v) => `${v.toFixed(1)}x`}
          />
          <Dropdown
            value={zoom.speed}
            options={[
              { value: 'smooth', label: 'Smooth' },
              { value: 'snappy', label: 'Snappy' },
              { value: 'instant', label: 'Instant' },
            ]}
            onChange={(v) => setZoom({ speed: v as 'smooth' | 'snappy' | 'instant' })}
            label="Speed"
          />
          <Slider
            value={zoom.easeIn}
            min={0}
            max={600}
            step={50}
            onChange={(v) => setZoom({ easeIn: v })}
            label="Ease In"
            unit="ms"
          />
          <Slider
            value={zoom.holdDuration}
            min={200}
            max={2000}
            step={100}
            onChange={(v) => setZoom({ holdDuration: v })}
            label="Hold Duration"
            unit="ms"
          />
          <Slider
            value={zoom.easeOut}
            min={0}
            max={600}
            step={50}
            onChange={(v) => setZoom({ easeOut: v })}
            label="Ease Out"
            unit="ms"
          />
          <button
            onClick={handleApplyToAll}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--panel2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              marginTop: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--green)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            Apply to All Events
          </button>
        </div>
      </Section>

      {/* CURSOR Section */}
      <Section title="Cursor">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Toggle
            checked={cursor.highlight}
            onChange={(v) => setCursor({ highlight: v })}
            label="Highlight"
          />
          {cursor.highlight && (
            <>
              <Slider
                value={cursor.size}
                min={10}
                max={40}
                step={2}
                onChange={(v) => setCursor({ size: v })}
                label="Size"
                unit="px"
              />
              <ColorPicker
                value={cursor.color}
                onChange={(v) => setCursor({ color: v })}
                label="Color"
              />
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
