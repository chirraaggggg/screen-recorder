'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { renderPreviewFrame } from '@/lib/canvas-preview';
import { getZoomAtTime } from '@/lib/zoom-engine';
import { exportVideo } from '@/lib/ffmpeg-processor';

export function VideoCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const {
    videoUrl,
    videoFile,
    videoDuration,
    videoWidth,
    videoHeight,
    currentTime,
    isPlaying,
    clickEvents,
    zoomFrames,
    background,
    layout,
    cursor,
    processing,
    setCurrentTime,
    setIsPlaying,
    setClickEvents,
    setProcessing,
  } = useEditorStore();

  // Listen for ZOOMCLIP_CLICKS from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ZOOMCLIP_CLICKS' && Array.isArray(event.data.clickEvents)) {
        const formattedEvents = event.data.clickEvents.map((e: { timestamp: number; x: number; y: number; target?: string; screenWidth?: number; screenHeight?: number }) => ({
          timestamp: e.timestamp,
          x: e.x,
          y: e.y,
          target: e.target || 'unknown',
          screenWidth: e.screenWidth || window.screen.width,
          screenHeight: e.screenHeight || window.screen.height,
        }));
        setClickEvents(formattedEvents);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setClickEvents]);

  // Handle video loading when URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.src = videoUrl;

    const handleLoadedMetadata = () => {
      if (videoFile) {
        useEditorStore.getState().setVideo(
          videoFile,
          videoUrl,
          video.duration,
          video.videoWidth,
          video.videoHeight
        );
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoUrl, videoFile]);

  // Start/stop render loop based on video state
  const startRenderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const currentVideoTime = video.currentTime;
      const timeMs = currentVideoTime * 1000;

      // Update store current time
      setCurrentTime(currentVideoTime);

      // Get zoom frame at current time
      const frame = getZoomAtTime(zoomFrames, timeMs, 60);

      // Render preview
      renderPreviewFrame(ctx, video, frame, {
        background,
        layout,
        cursor,
      });

      animationRef.current = requestAnimationFrame(render);
    };

    // Set canvas resolution
    canvas.width = 1280;
    canvas.height = 720;

    animationRef.current = requestAnimationFrame(render);
  }, [zoomFrames, background, layout, cursor, setCurrentTime]);

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play();
      startRenderLoop();
    } else {
      video.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [isPlaying, startRenderLoop, setIsPlaying]);

  // Handle export when processing status changes
  useEffect(() => {
    if (processing.status === 'processing' && !isProcessingRef.current) {
      isProcessingRef.current = true;

      const doExport = async () => {
        if (!videoFile) return;

        try {
          const blob = await exportVideo(
            videoFile,
            zoomFrames,
            layout,
            useEditorStore.getState().exportSettings,
            videoWidth,
            videoHeight,
            (pct, frame, total, eta) => {
              setProcessing({
                progress: pct,
                frame,
                totalFrames: total,
                eta,
                message: `Processing frame ${frame} of ${total}`,
              });
            }
          );

          const outputUrl = URL.createObjectURL(blob);
          setProcessing({
            status: 'done',
            progress: 100,
            outputUrl,
            message: 'Export complete!',
          });
        } catch (error) {
          setProcessing({
            status: 'error',
            message: error instanceof Error ? error.message : 'Export failed',
          });
        } finally {
          isProcessingRef.current = false;
        }
      };

      doExport();
    }
  }, [processing.status, videoFile, zoomFrames, layout, videoWidth, videoHeight, setProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 'auto',
          aspectRatio: '16/9',
          borderRadius: 8,
        }}
      />
    </div>
  );
}
