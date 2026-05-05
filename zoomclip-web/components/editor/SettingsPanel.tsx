"use client";

import React from "react";
import { EditorSettings, VideoMetadata } from "../../lib/types";

interface SettingsPanelProps {
  settings: EditorSettings;
  setSettings: (updater: (prev: EditorSettings) => EditorSettings) => void;
  metadata: VideoMetadata | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, metadata }) => {
  const handleChange = (key: keyof EditorSettings, value: EditorSettings[keyof EditorSettings]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--zoom-surface)] border-r border-[var(--zoom-border)] p-5 overflow-y-auto w-[280px] shrink-0">
      
      {/* Video Metadata Section */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-[var(--zoom-text-secondary)] uppercase tracking-wider mb-4">
          Recording Details
        </h3>
        {metadata ? (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-[var(--zoom-text-secondary)] block text-xs">Filename</span>
              <span className="text-[var(--zoom-text-primary)] truncate block max-w-full" title={metadata.filename}>
                {metadata.filename}
              </span>
            </div>
            <div className="flex gap-4">
              <div className="text-sm">
                <span className="text-[var(--zoom-text-secondary)] block text-xs">Duration</span>
                <span className="text-[var(--zoom-text-primary)]">
                  {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toFixed(0).padStart(2, '0')}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-[var(--zoom-text-secondary)] block text-xs">Resolution</span>
                <span className="text-[var(--zoom-text-primary)]">
                  {metadata.resolution.width}x{metadata.resolution.height}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[var(--zoom-text-secondary)]">No video loaded</div>
        )}
      </div>

      <hr className="border-[var(--zoom-border)] mb-8" />

      {/* Settings Section */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--zoom-text-secondary)] uppercase tracking-wider mb-6">
          Effect Settings
        </h3>
        
        <div className="space-y-6">
          {/* Zoom Level Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-[var(--zoom-text-primary)]">Zoom Scale</label>
              <span className="text-xs text-[var(--zoom-accent)] font-medium bg-[var(--zoom-accent)]/10 px-2 py-0.5 rounded">
                {settings.zoomLevel.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={settings.zoomLevel}
              onChange={(e) => handleChange("zoomLevel", parseFloat(e.target.value))}
              className="editor-slider"
            />
          </div>

          {/* Ease Duration Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-[var(--zoom-text-primary)]">Ease In</label>
              <span className="text-xs text-[var(--zoom-accent)] font-medium bg-[var(--zoom-accent)]/10 px-2 py-0.5 rounded">
                {settings.easeDuration}ms
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="800"
              step="50"
              value={settings.easeDuration}
              onChange={(e) => handleChange("easeDuration", parseInt(e.target.value))}
              className="editor-slider"
            />
          </div>

          {/* Hold Duration Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-[var(--zoom-text-primary)]">Hold Duration</label>
              <span className="text-xs text-[var(--zoom-accent)] font-medium bg-[var(--zoom-accent)]/10 px-2 py-0.5 rounded">
                {settings.holdDuration}ms
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={settings.holdDuration}
              onChange={(e) => handleChange("holdDuration", parseInt(e.target.value))}
              className="editor-slider"
            />
          </div>

          {/* Cursor Highlight Toggle */}
          <div className="flex items-center justify-between pt-2">
            <label className="text-sm text-[var(--zoom-text-primary)]">Cursor Highlight</label>
            <button
              onClick={() => handleChange("cursorHighlight", !settings.cursorHighlight)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.cursorHighlight ? "bg-[var(--zoom-accent)]" : "bg-[var(--zoom-border)]"
              }`}
            >
              <span
                className={`transform transition duration-200 ease-in-out inline-block h-3 w-3 rounded-full bg-white shadow ${
                  settings.cursorHighlight ? "translate-x-2" : "-translate-x-2"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
