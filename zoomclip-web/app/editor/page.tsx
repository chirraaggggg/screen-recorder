"use client";

import "../../styles/editor.css";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SettingsPanel }       from "../../components/editor/SettingsPanel";
import { VideoPlayer }         from "../../components/editor/VideoPlayer";
import { Timeline }            from "../../components/editor/Timeline";
import { ZoomEventList }       from "../../components/editor/ZoomEventList";
import { DetectionProgress }   from "../../components/editor/DetectionProgress";
import { ClickEvent, EditorSettings, VideoMetadata } from "../../lib/types";
import { processVideoWithZoom, ProcessingProgress } from "../../lib/ffmpeg";

// ── Types ───────────────────────────────────────────────────────────────────
type EditorState = 
  | "waiting-recording"      // State 1: No video, no clicks
  | "clicks-received"        // State 2: Clicks received, waiting for video
  | "ready"                  // State 3: Both video + clicks loaded
  | "processing"             // State 4: Processing video
  | "done";                  // State 5: Processing complete

type ChromeRuntimeLike = {
  sendMessage?: (
    message: unknown,
    callback?: (response: unknown) => void
  ) => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function EditorPage() {
  // ── State ───────────────────────────────────────────────────────────────────
  const [editorState, setEditorState] = useState<EditorState>("waiting-recording");
  
  // Video state
  const [videoFile, setVideoFile]   = useState<File | null>(null);
  const [videoUrl,  setVideoUrl]    = useState<string | null>(null);
  const [metadata,  setMetadata]    = useState<VideoMetadata | null>(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);

  // Events & settings
  const [events,   setEvents]   = useState<ClickEvent[]>([]);
  const [settings, setSettings] = useState<EditorSettings>({
    zoomLevel:        2.0,
    easeDuration:     300,
    holdDuration:     800,
    backgroundColor:  "#0f0f0f",
    cursorHighlight:  true,
  });

  // Playback
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [duration,    setDuration]    = useState(0);

  // Processing
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    progress: 0,
    message: "",
  });

  // UI state
  const [isAddingZoom, setIsAddingZoom] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Listen for extension messages (ZOOMCLIP_CLICKS) ─────────────────────────
  useEffect(() => {
    // Method 1: Listen for postMessage from editor-bridge.js
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ZOOMCLIP_CLICKS" && Array.isArray(event.data.clickEvents)) {
        const rawEvents = event.data.clickEvents as unknown[];
        const normalized: ClickEvent[] = rawEvents.map((raw) => {
          const r = raw as {
            id?: unknown;
            timestamp?: unknown;
            x?: unknown;
            y?: unknown;
            confidence?: unknown;
            target?: unknown;
            source?: unknown;
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
        
        // Transition from waiting to clicks-received
        if (editorState === "waiting-recording") {
          setEditorState("clicks-received");
        }
        
        showToast(`Recording loaded — ${normalized.length} clicks captured`);
      }
    };

    window.addEventListener("message", handleMessage);

    // Method 2: Request events from chrome.runtime (for when tab already exists)
    const runtime = getChromeRuntime();
    if (typeof runtime?.sendMessage === "function") {
      runtime.sendMessage({ type: "GET_PENDING_CLICK_EVENTS" }, (response) => {
        const res = response as { events?: unknown };
        if (Array.isArray(res?.events) && res.events.length > 0) {
          const normalized: ClickEvent[] = res.events.map((raw) => {
            const r = raw as {
              id?: unknown;
              timestamp?: unknown;
              x?: unknown;
              y?: unknown;
              confidence?: unknown;
              target?: unknown;
              source?: unknown;
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
          if (editorState === "waiting-recording") {
            setEditorState("clicks-received");
          }
          showToast(`Recording loaded — ${normalized.length} clicks captured`);
        }
      });
    }

    // Method 3: Read from URL params (fallback)
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("clicks");
    if (encoded) {
      try {
        const clicks = JSON.parse(decodeURIComponent(encoded)) as ClickEvent[];
        setEvents(clicks);
        if (editorState === "waiting-recording") {
          setEditorState("clicks-received");
        }
        showToast(`Recording loaded — ${clicks.length} clicks captured`);
      } catch (_) {
        // Ignore parse errors
      }
    }

    return () => window.removeEventListener("message", handleMessage);
  }, [editorState, showToast]);

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

  // ── File handling ────────────────────────────────────────────────────────────
  const handleFileLoad = useCallback((file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    setMetadata({
      filename:   file.name,
      duration:   0,
      resolution: { width: 1920, height: 1080 },
    });

    // Transition to ready state
    if (events.length > 0) {
      setEditorState("ready");
    } else {
      setEditorState("ready");
    }
  }, [videoUrl, events.length]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "video/webm") {
      handleFileLoad(file);
    }
  }, [handleFileLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "video/webm") {
      handleFileLoad(file);
    }
  }, [handleFileLoad]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDurationChange = useCallback((d: number) => {
    setDuration(d);
    setMetadata(prev => prev ? {
      ...prev,
      duration:   d,
      resolution: {
        width:  videoRef.current?.videoWidth  ?? 1920,
        height: videoRef.current?.videoHeight ?? 1080,
      },
    } : null);
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  // ── Manual placement ─────────────────────────────────────────────────────────
  const handleManualZoomPlaced = useCallback((event: ClickEvent) => {
    setEvents(prev => [...prev, event].sort((a, b) => a.timestamp - b.timestamp));
    setIsAddingZoom(false);
    showToast(`Zoom point added at ${(event.timestamp / 1000).toFixed(2)}s`);
  }, [showToast]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleAddEventFromPanel = useCallback(() => {
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
  }, [currentTime, metadata]);

  // ── Video processing ─────────────────────────────────────────────────────────
  const handleProcessVideo = useCallback(async () => {
    if (!videoFile || events.length === 0) return;

    setEditorState("processing");
    setProcessingProgress({ progress: 0, message: "Initializing..." });

    try {
      const videoData: { file: File; duration: number; width: number; height: number } = {
        file: videoFile,
        duration: duration,
        width: metadata?.resolution.width ?? 1920,
        height: metadata?.resolution.height ?? 1080,
      };

      const blob = await processVideoWithZoom({
        video: videoData,
        clickEvents: events,
        settings: settings,
        onProgress: (p) => setProcessingProgress(p),
      });

      const url = URL.createObjectURL(blob);
      setProcessedVideoUrl(url);
      setEditorState("done");
      showToast("Video processing complete!");
    } catch (err) {
      console.error("Processing failed:", err);
      showToast("Processing failed — please try again");
      setEditorState("ready");
    }
  }, [videoFile, events, settings, duration, metadata, showToast]);

  const handleExport = useCallback(() => {
    if (!processedVideoUrl) return;
    
    const a = document.createElement("a");
    a.href = processedVideoUrl;
    a.download = `zoomclip-export-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [processedVideoUrl]);

  const handleProcessAgain = useCallback(() => {
    if (processedVideoUrl) {
      URL.revokeObjectURL(processedVideoUrl);
    }
    setProcessedVideoUrl(null);
    setEditorState("ready");
  }, [processedVideoUrl]);

  // ── State 1: Waiting for recording ──────────────────────────────────────────
  if (editorState === "waiting-recording") {
    return (
      <main className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-8 font-[Inter,system-ui,sans-serif]">
        <div className="text-center max-w-lg">
          {/* Pulsing green dot */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-4 h-4 bg-[#38d86f] rounded-full animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-[#38d86f] rounded-full animate-ping opacity-75" />
            </div>
          </div>
          
          <h1 className="text-2xl font-semibold text-white mb-4">
            Waiting for recording...
          </h1>
          
          <p className="text-[#9ca3af] text-lg mb-8 leading-relaxed">
            Open a website, click Record in ZoomClip, then Stop.<br />
            Your video will download and clicks will appear here automatically.
          </p>

          <div className="border-t border-[#1f1f1f] pt-8">
            <p className="text-[#64748b] text-sm mb-4">Or upload manually</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white rounded-lg transition-colors text-sm font-medium border border-[#2a2a2a]"
            >
              Upload Video File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1f1f1f] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-full shadow-lg">
            {toast}
          </div>
        )}
      </main>
    );
  }

  // ── State 2: Clicks received, waiting for video ─────────────────────────────
  if (editorState === "clicks-received") {
    return (
      <main className="min-h-screen bg-[#0f0f0f] flex flex-col font-[Inter,system-ui,sans-serif]">
        {/* Green banner */}
        <div className="bg-[#38d86f] text-[#0f0f0f] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="font-semibold">
              {events.length} clicks captured from your recording
            </span>
          </div>
          <span className="text-sm opacity-80">
            Upload the video that just downloaded to your Downloads folder
          </span>
        </div>

        {/* Upload zone */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              w-full max-w-2xl h-80 border-2 border-dashed rounded-2xl
              flex flex-col items-center justify-center
              transition-all duration-200 cursor-pointer
              ${isDragging 
                ? "border-[#38d86f] bg-[#38d86f]/10" 
                : "border-[#38d86f]/50 bg-[#1f1f1f]/50 hover:border-[#38d86f]/80"
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`w-16 h-16 rounded-full bg-[#38d86f]/20 flex items-center justify-center mb-4 ${isDragging ? "animate-pulse" : ""}`}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38d86f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop your .webm recording here
            </h3>
            <p className="text-[#9ca3af] text-sm mb-1">
              Check your Downloads folder — it was just saved there
            </p>
            <p className="text-[#64748b] text-xs">
              Accepts .webm files only
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1f1f1f] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-full shadow-lg">
            {toast}
          </div>
        )}
      </main>
    );
  }

  // ── State 4: Processing ─────────────────────────────────────────────────────
  if (editorState === "processing") {
    return (
      <main className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center font-[Inter,system-ui,sans-serif]">
        <div className="w-full max-w-md text-center">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-[#38d86f] transition-all duration-300"
                style={{ width: `${processingProgress.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#9ca3af]">{processingProgress.message}</span>
              <span className="text-[#38d86f] font-medium">{processingProgress.progress}%</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-center justify-center gap-2 text-[#ff4d4d]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-sm font-medium">Do not close this tab</span>
          </div>

          <p className="text-[#64748b] text-sm mt-8">
            Processing with ffmpeg.wasm in your browser
          </p>
        </div>
      </main>
    );
  }

  // ── State 5: Done ───────────────────────────────────────────────────────────
  if (editorState === "done") {
    return (
      <main className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center font-[Inter,system-ui,sans-serif]">
        <div className="text-center max-w-lg">
          {/* Success icon */}
          <div className="w-16 h-16 rounded-full bg-[#38d86f]/20 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38d86f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-white mb-2">
            Processing Complete!
          </h1>
          <p className="text-[#9ca3af] mb-8">
            Your video with zoom effects is ready
          </p>

          {/* Video preview */}
          {processedVideoUrl && (
            <div className="mb-8 rounded-xl overflow-hidden bg-[#1f1f1f]">
              <video
                src={processedVideoUrl}
                controls
                className="w-full max-h-64"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleExport}
              className="px-8 py-3 bg-[#38d86f] hover:bg-[#2cb85a] text-[#0f0f0f] font-semibold rounded-lg transition-colors"
            >
              Export MP4
            </button>
            <button
              onClick={handleProcessAgain}
              className="px-8 py-3 bg-transparent border border-[#2a2a2a] hover:bg-[#1f1f1f] text-white rounded-lg transition-colors"
            >
              Process Again
            </button>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1f1f1f] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-full shadow-lg">
            {toast}
          </div>
        )}
      </main>
    );
  }

  // ── State 3: Ready (both video + clicks loaded) ────────────────────────────
  return (
    <main className="h-screen w-screen flex flex-col bg-[#0f0f0f] text-white overflow-hidden font-[Inter,system-ui,sans-serif]">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-[#161616] border-b border-[#1f1f1f] shrink-0 flex items-center justify-between px-4 z-10">
        {/* Left: logo + filename */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#38d86f] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0f0f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="#0f0f0f" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">ZoomClip</span>
          </div>
          <div className="h-4 w-px bg-[#2a2a2a]" />
          <span className="text-xs text-[#9ca3af] max-w-[200px] truncate" title={metadata?.filename}>
            {metadata?.filename}
          </span>
        </div>

        {/* Center: Clicks count + Add Zoom Point */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#64748b]">
            {events.length} click{events.length !== 1 ? "s" : ""} captured
          </span>
          <button
            onClick={() => setIsAddingZoom(v => !v)}
            className={`flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-medium transition-all ${
              isAddingZoom
                ? "bg-[#38d86f] text-[#0f0f0f]"
                : "bg-[#1f1f1f] border border-[#2a2a2a] text-[#9ca3af] hover:text-white"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {isAddingZoom ? "Click on video" : "Add Zoom Point"}
          </button>
        </div>

        {/* Right: Apply Zoom Effects button */}
        <button
          onClick={handleProcessVideo}
          disabled={events.length === 0}
          className="px-5 h-9 bg-[#ff4d4d] hover:bg-[#e04343] disabled:bg-[#2a2a2a] disabled:text-[#64748b] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Apply Zoom Effects
        </button>
      </header>

      {/* ── Main columns ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Settings panel */}
        <SettingsPanel settings={settings} setSettings={setSettings} metadata={metadata} />

        {/* Center: Video player + timeline */}
        <div className="flex flex-col flex-1 min-w-0 bg-[#0a0a0a] overflow-hidden">
          <VideoPlayer
            videoUrl={videoUrl || ""}
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
          <div className="shrink-0 bg-[#161616] border-t border-[#1f1f1f] py-3">
            <div className="px-4 mb-2 flex items-center justify-center gap-3">
              <span className="font-mono text-xs text-[#64748b] w-14 text-right">
                {formatTime(currentTime)}
              </span>

              <button
                onClick={() => setIsPlaying(p => !p)}
                className="w-9 h-9 rounded-full bg-white text-[#0f0f0f] flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              <span className="font-mono text-xs text-[#64748b] w-14">
                {formatTime(duration)}
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

        {/* Right: Click events list */}
        <ZoomEventList
          events={events}
          onSeek={handleSeek}
          onDelete={handleDeleteEvent}
          onAddEvent={handleAddEventFromPanel}
        />
      </div>

      {/* ── Toast notifications ─────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1f1f1f] border border-[#2a2a2a] text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
