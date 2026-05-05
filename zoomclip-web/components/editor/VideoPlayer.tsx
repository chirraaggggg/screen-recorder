"use client";

import React, { useRef, useEffect } from "react";
import { ClickEvent, EditorSettings } from "../../lib/types";

interface VideoPlayerProps {
  videoUrl: string;
  currentTime: number;
  isPlaying: boolean;
  events: ClickEvent[];
  settings: EditorSettings;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isAddingZoom: boolean;
  onManualZoomPlaced: (event: ClickEvent) => void;
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function applyZoomToCanvas(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement,
  zoomLevel: number,
  centerX: number,
  centerY: number,
  canvasW: number,
  canvasH: number
) {
  const actualVidW = videoEl.videoWidth || canvasW;
  const actualVidH = videoEl.videoHeight || canvasH;
  const xRatio = canvasW / actualVidW;
  const yRatio = canvasH / actualVidH;

  const srcW = canvasW / zoomLevel;
  const srcH = canvasH / zoomLevel;

  let srcX = (centerX * xRatio) - srcW / 2;
  let srcY = (centerY * yRatio) - srcH / 2;

  srcX = Math.max(0, Math.min(srcX, canvasW - srcW));
  srcY = Math.max(0, Math.min(srcY, canvasH - srcH));

  ctx.drawImage(videoEl, srcX, srcY, srcW, srcH, 0, 0, canvasW, canvasH);
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  isPlaying,
  events,
  settings,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  videoRef,
  isAddingZoom,
  onManualZoomPlaced,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  // ── Canvas render loop ─────────────────────────────────────────────────────
  const renderFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) { rafRef.current = requestAnimationFrame(renderFrame); return; }

    // Keep canvas resolution in sync with video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width  = video.videoWidth  || 1920;
      canvas.height = video.videoHeight || 1080;
    }

    const tS = video.currentTime;
    const tMs = tS * 1000;
    onTimeUpdate(tS);

    ctx.fillStyle = settings.backgroundColor || "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find the active zoom event
    const easeMs = settings.easeDuration;
    const holdMs = settings.holdDuration;
    const windowMs = easeMs * 2 + holdMs;

    let activeEvent: ClickEvent | null = null;
    let eventStartMs = 0;

    for (const ev of events) {
      if (tMs >= ev.timestamp && tMs <= ev.timestamp + windowMs) {
        activeEvent = ev;
        eventStartMs  = ev.timestamp;
        break;
      }
    }

    if (activeEvent) {
      const elapsed = tMs - eventStartMs;
      let zoom = 1;

      if (elapsed <= easeMs) {
        zoom = 1 + (settings.zoomLevel - 1) * easeOutCubic(elapsed / easeMs);
      } else if (elapsed <= easeMs + holdMs) {
        zoom = settings.zoomLevel;
      } else {
        const outProgress = (elapsed - easeMs - holdMs) / easeMs;
        zoom = settings.zoomLevel - (settings.zoomLevel - 1) * easeOutCubic(outProgress);
      }

      applyZoomToCanvas(ctx, video, zoom, activeEvent.x, activeEvent.y, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, settings]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.play().catch(console.error);
    else video.pause();
  }, [isPlaying, videoRef]);

  // ── Manual zoom placement ──────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAddingZoom) return;
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    const rect   = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const videoX = Math.round(canvasX * (video.videoWidth  / rect.width));
    const videoY = Math.round(canvasY * (video.videoHeight / rect.height));

    const newEvent: ClickEvent = {
      id:         crypto.randomUUID(),
      timestamp:  Math.round(video.currentTime * 1000),
      x:          videoX,
      y:          videoY,
      confidence: 1,
      source:     "MANUAL",
      target:     "MANUAL",
    };

    onManualZoomPlaced(newEvent);
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden relative bg-[#060606]">
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        onLoadedMetadata={e => onDurationChange(e.currentTarget.duration)}
        onEnded={onEnded}
        playsInline
        muted={false}
      />

      <div
        className={`relative w-full max-w-[82vw] mx-auto aspect-video shadow-2xl overflow-hidden rounded-lg border border-[var(--zoom-border)]/40 ${
          isAddingZoom ? "ring-2 ring-[var(--zoom-accent)] ring-offset-2 ring-offset-[#060606]" : ""
        }`}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`w-full h-full block ${isAddingZoom ? "cursor-crosshair" : "cursor-default"}`}
        />

        {/* "Click to place zoom" overlay hint */}
        {isAddingZoom && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-[var(--zoom-accent)] text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
              Click anywhere on the video to place zoom point
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
