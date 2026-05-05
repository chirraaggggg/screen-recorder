"use client";

import "../../styles/editor.css";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { UploadZone }          from "../../components/editor/UploadZone";
import { SettingsPanel }       from "../../components/editor/SettingsPanel";
import { VideoPlayer }         from "../../components/editor/VideoPlayer";
import { Timeline }            from "../../components/editor/Timeline";
import { ZoomEventList }       from "../../components/editor/ZoomEventList";
import { ExportButton }        from "../../components/editor/ExportButton";
import { DetectionProgress }   from "../../components/editor/DetectionProgress";
import { ClickEvent, EditorSettings, VideoMetadata } from "../../lib/types";
import { detectClicksFromVideo, DetectionState } from "../../lib/clickDetection";
import { processVideo }        from "../../lib/zoomProcessor";

type ChromeRuntimeLike = {
  sendMessage?: (
    message: unknown,
    callback?: (response: unknown) => void
  ) => void;
};

function getChromeRuntime(): ChromeRuntimeLike | null {
  const w = window as unknown as { chrome?: { runtime?: ChromeRuntimeLike } };
  return w?.chrome?.runtime ?? null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default function EditorPage() {
  // ── Video state ────────────────────────────────────────────────────────────
  const [videoFile, setVideoFile]   = useState<File | null>(null);
  const [videoUrl,  setVideoUrl]    = useState<string | null>(null);
  const [metadata,  setMetadata]    = useState<VideoMetadata | null>(null);

  // ── Events & settings ──────────────────────────────────────────────────────
  const [events,   setEvents]   = useState<ClickEvent[]>([]);
  const [settings, setSettings] = useState<EditorSettings>({
    zoomLevel:        1.8,
    easeDuration:     300,
    holdDuration:     800,
    backgroundColor:  "#000000",
    cursorHighlight:  true,
  });

  // ── Playback ───────────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [duration,    setDuration]    = useState(0);

  // ── Export ─────────────────────────────────────────────────────────────────
  const [isExporting,    setIsExporting]    = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // ── Detection ──────────────────────────────────────────────────────────────
  const [isAnalyzing,     setIsAnalyzing]     = useState(false);
  const [detectionState,  setDetectionState]  = useState<DetectionState>({
    frame: 0, totalFrames: 0, pct: 0, foundCount: 0,
  });

  // ── Manual zoom mode ───────────────────────────────────────────────────────
  const [isAddingZoom, setIsAddingZoom] = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.code === "ArrowLeft") {
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.code === "ArrowRight") {
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
      } else if (e.code === "Escape") {
        setIsAddingZoom(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  // ── Layer 1: Extension click passthrough ───────────────────────────────────
  // When editor opens with ?source=extension, request pending events from the extension
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "extension") return;

    // The extension injects a content script that can relay messages.
    // We use chrome.runtime.sendMessage if available (extension context).
    // Fallback: listen for a window.postMessage from any relay.
    const tryExtension = () => {
      const runtime = getChromeRuntime();
      if (typeof runtime?.sendMessage !== "function") return;

      runtime.sendMessage({ type: "GET_PENDING_CLICK_EVENTS" }, (response) => {
        const res = response as { events?: unknown };
        if (!Array.isArray(res?.events) || res.events.length === 0) return;

        const normalized: ClickEvent[] = res.events.map((raw) => {
          const r = raw as Partial<ClickEvent> & {
            timestamp?: unknown;
            x?: unknown;
            y?: unknown;
            confidence?: unknown;
            target?: unknown;
            source?: unknown;
            id?: unknown;
          };

          return {
            id:         typeof r.id === "string" ? r.id : crypto.randomUUID(),
            timestamp:  asNumber(r.timestamp, 0),
            x:          asNumber(r.x, 0),
            y:          asNumber(r.y, 0),
            confidence: asNumber(r.confidence, 1),
            source:     asString(r.source) ?? "EXTENSION",
            target:     asString(r.target),
          };
        });

        setEvents(normalized);
        showToast(`✓ Loaded ${normalized.length} click events from extension`);
      });
    };

    // Give the tab a moment to initialise before querying
    const t = setTimeout(tryExtension, 800);

    // Also listen for postMessage relay (in case the extension sends it directly)
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "ZOOM_CLIP_EVENTS" && Array.isArray(e.data.clickEvents)) {
        const evs: ClickEvent[] = (e.data.clickEvents as unknown[]).map((raw) => {
          const r = raw as {
            id?: unknown;
            timestamp?: unknown;
            x?: unknown;
            y?: unknown;
            confidence?: unknown;
            target?: unknown;
          };

          return {
            id:         typeof r.id === "string" ? r.id : crypto.randomUUID(),
            timestamp:  asNumber(r.timestamp, 0),
            x:          asNumber(r.x, 0),
            y:          asNumber(r.y, 0),
            confidence: asNumber(r.confidence, 1),
            source:     "EXTENSION",
            target:     asString(r.target),
          };
        });
        setEvents(evs);
        showToast(`✓ Loaded ${evs.length} click events from extension`);
      }
    };
    window.addEventListener("message", onMsg);

    // Ask any injected relay for events (handshake). Safe even if no relay exists.
    setTimeout(() => {
      try {
        window.postMessage({ type: "ZOOM_CLIP_REQUEST_EVENTS" }, "*");
      } catch {}
    }, 50);

    return () => { clearTimeout(t); window.removeEventListener("message", onMsg); };
  }, []);

  // ── Layer 2: Cursor-stop auto detection on uploaded video ──────────────────
  const runAutoDetection = useCallback(async (vid: HTMLVideoElement) => {
    setIsAnalyzing(true);
    setDetectionState({ frame: 0, totalFrames: 0, pct: 0, foundCount: 0 });

    try {
      const detected = await detectClicksFromVideo(vid, state => setDetectionState(state));

      setEvents(detected);
      if (detected.length > 0) {
        showToast(`✓ Detected ${detected.length} click event${detected.length !== 1 ? "s" : ""} automatically`);
      } else {
        showToast("No clicks detected — use the '+ Add Zoom Point' button to place them manually");
      }
    } catch (err) {
      console.error("Auto-detection failed:", err);
      showToast("Detection failed — place zoom points manually");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ── File load ──────────────────────────────────────────────────────────────
  const handleFileLoad = async (file: File, preDetectedEvents?: ClickEvent[]) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setEvents([]);
    setIsPlaying(false);
    setCurrentTime(0);

    setMetadata({
      filename:   file.name,
      duration:   0,
      resolution: { width: 1920, height: 1080 },
    });

    if (preDetectedEvents && preDetectedEvents.length > 0) {
      // Layer 1 path: use extension-provided events directly
      const normalized = preDetectedEvents.map(ev => ({
        ...ev,
        id:         ev.id         || crypto.randomUUID(),
        confidence: ev.confidence ?? 1,
        source:     ev.source    || "EXTENSION",
        target:     ev.target,
      }));
      setEvents(normalized);
      showToast(`✓ ${normalized.length} click events loaded from extension`);
    } else {
      // Layer 2 path: run cursor visual detection
      // We need the video element ready first — wait for loadeddata
      const doDetect = () => {
        const vid = videoRef.current;
        if (vid) runAutoDetection(vid);
      };
      // Give the <video> element time to bind the new src
      setTimeout(doDetect, 300);
    }
  };

  const handleDurationChange = (d: number) => {
    setDuration(d);
    setMetadata(prev => prev ? {
      ...prev,
      duration:   d,
      resolution: {
        width:  videoRef.current?.videoWidth  ?? 1920,
        height: videoRef.current?.videoHeight ?? 1080,
      },
    } : null);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // ── Layer 3: Manual placement callback ────────────────────────────────────
  const handleManualZoomPlaced = (event: ClickEvent) => {
    setEvents(prev => [...prev, event].sort((a, b) => a.timestamp - b.timestamp));
    setIsAddingZoom(false);
    showToast(`✓ Zoom point added at ${(event.timestamp / 1000).toFixed(2)}s`);
  };

  const handleDeleteEvent = (id: string) =>
    setEvents(prev => prev.filter(e => e.id !== id));

  // "Add Event" from right panel adds a centered event at current playhead
  const handleAddEventFromPanel = () => {
    const newEvent: ClickEvent = {
      id:         crypto.randomUUID(),
      timestamp:  Math.round(currentTime * 1000),
      x:          metadata?.resolution.width  ?? 960,
      y:          metadata?.resolution.height ?? 540,
      confidence: 1,
      source:     "MANUAL",
      target:     "MANUAL",
    };
    setEvents(prev => [...prev, newEvent].sort((a, b) => a.timestamp - b.timestamp));
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async (format: "mp4" | "gif" | "720p") => {
    if (!videoFile) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      const blob = await processVideo({ videoFile, events, settings, format, onProgress: setExportProgress });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement("a"), {
        href:     url,
        download: `zoomclip-export-${Date.now()}.${format === "gif" ? "gif" : "mp4"}`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      showToast("Export failed — see console");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Upload screen ──────────────────────────────────────────────────────────
  if (!videoUrl) {
    return (
      <main className="min-h-screen bg-[var(--zoom-bg)] flex items-center justify-center p-8 editor-mode">
        <UploadZone onFileSelect={handleFileLoad} />
      </main>
    );
  }

  // ── Editor layout ──────────────────────────────────────────────────────────
  return (
    <main className="h-screen w-screen flex flex-col bg-[var(--zoom-bg)] text-[var(--zoom-text-primary)] overflow-hidden editor-mode">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="h-[52px] bg-[var(--zoom-surface)] border-b border-[var(--zoom-border)] shrink-0 flex items-center justify-between px-4 z-10">
        {/* Left: logo + filename */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--zoom-accent)] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z" />
                <rect x="3" y="6" width="12" height="12" rx="2" />
              </svg>
            </div>
            <span className="font-semibold text-[15px] tracking-tight">ZoomClip</span>
          </div>
          <div className="h-4 w-px bg-[var(--zoom-border)]" />
          <span className="text-sm text-[var(--zoom-text-secondary)] max-w-[200px] truncate" title={metadata?.filename}>
            {metadata?.filename}
          </span>
        </div>

        {/* Center: Add Zoom Point button */}
        <button
          onClick={() => setIsAddingZoom(v => !v)}
          className={`flex items-center gap-2 px-3 h-8 rounded-[var(--zoom-radius-button)] text-sm font-medium transition-all ${
            isAddingZoom
              ? "bg-[var(--zoom-accent)] text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]"
              : "bg-[var(--zoom-surface-light)] border border-[var(--zoom-border)] text-[var(--zoom-text-secondary)] hover:text-[var(--zoom-text-primary)]"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {isAddingZoom ? "Click on video to place" : "Add Zoom Point"}
        </button>

        {/* Right: Export */}
        <ExportButton onExport={handleExport} isExporting={isExporting} progress={exportProgress} />
      </header>

      {/* ── Main columns ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        <SettingsPanel settings={settings} setSettings={setSettings} metadata={metadata} />

        {/* Center: player + transport + timeline */}
        <div className="flex flex-col flex-1 min-w-0 bg-[#060606] overflow-hidden">
          <VideoPlayer
            videoUrl={videoUrl}
            currentTime={currentTime}
            isPlaying={isPlaying}
            events={events}
            settings={settings}
            onTimeUpdate={setCurrentTime}
            onDurationChange={handleDurationChange}
            onEnded={() => setIsPlaying(false)}
            videoRef={videoRef}
            isAddingZoom={isAddingZoom}
            onManualZoomPlaced={handleManualZoomPlaced}
          />

          {/* Transport bar */}
          <div className="shrink-0 bg-[var(--zoom-surface)] border-t border-[var(--zoom-border)] pt-3 pb-1">
            <div className="px-5 mb-2 flex items-center justify-center gap-4">
              <span className="font-mono text-xs text-[var(--zoom-text-secondary)] w-14 text-right">
                {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, "0")}
              </span>

              <button
                onClick={() => setIsPlaying(p => !p)}
                className="w-8 h-8 rounded-full bg-[var(--zoom-text-primary)] text-black flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                }
              </button>

              <span className="font-mono text-xs text-[var(--zoom-text-secondary)] w-14">
                {Math.floor(duration / 60)}:{(duration % 60).toFixed(1).padStart(4, "0")}
              </span>
            </div>

            <Timeline
              duration={duration}
              currentTime={currentTime}
              events={events}
              onSeek={handleSeek}
            />
          </div>
        </div>

        {/* Right panel */}
        <ZoomEventList
          events={events}
          onSeek={handleSeek}
          onDelete={handleDeleteEvent}
          onAddEvent={handleAddEventFromPanel}
        />
      </div>

      {/* ── Detection progress overlay ──────────────────────────────────────── */}
      <DetectionProgress isVisible={isAnalyzing} state={detectionState} />

      {/* ── Toast notifications ─────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--zoom-surface-light)] border border-[var(--zoom-border)] text-sm text-[var(--zoom-text-primary)] px-4 py-2.5 rounded-full shadow-[var(--zoom-shadow)] pointer-events-none animate-[slideUp_0.2s_ease]">
          {toast}
        </div>
      )}
    </main>
  );
}
