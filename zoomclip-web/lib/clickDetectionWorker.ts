/// <reference lib="webworker" />

// clickDetectionWorker.ts
// Web Worker: receives ImageBitmaps, finds cursor, detects click "stop" pattern, and streams progress.

import type { ClickEvent } from "./types";

type InitMessage = {
  type: "INIT";
  config: {
    analysisWidth: number;
    analysisHeight: number;
    videoWidth: number;
    videoHeight: number;
    totalFrames: number;

    sampleIntervalMs: number;
    cursorMoveThreshold: number;
    minGapMs: number;
    confidenceThreshold: number;
  };
};

type FrameMessage = {
  type: "FRAME";
  frameIndex: number;
  timeMs: number;
  bitmap: ImageBitmap;
};

type FinalizeMessage = { type: "FINALIZE" };

type WorkerRequest = InitMessage | FrameMessage | FinalizeMessage;

type ProgressMessage = {
  type: "PROGRESS";
  frameIndex: number;
  frame: number;
  totalFrames: number;
  pct: number;
  foundCount: number;
};

type DoneMessage = { type: "DONE"; events: ClickEvent[] };
type ErrorMessage = { type: "ERROR"; message: string };

type WorkerResponse = ProgressMessage | DoneMessage | ErrorMessage;

type Point = { x: number; y: number };

let config: InitMessage["config"] | null = null;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

let prevCursor: Point | null = null;
let prevCursor2: Point | null = null;
let lastClickTimeMs = -999999;
let rawEvents: ClickEvent[] = [];

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getSurroundBrightness(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number
): number {
  const offsets: Array<[number, number]> = [
    [-8, 0],
    [8, 0],
    [0, -8],
    [0, 8],
  ];
  let total = 0;
  let count = 0;

  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    const i = (ny * width + nx) * 4;
    total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    count++;
  }
  return count > 0 ? total / count : 0;
}

// Find the brightest small cluster of pixels = likely cursor highlight/tip.
function findCursorInFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Point | null {
  let maxContrast = 0;
  let cursorX = 0;
  let cursorY = 0;
  let found = false;

  // Sample every 4th pixel for performance
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * 4;
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness <= 240) continue;

      const surroundBrightness = getSurroundBrightness(data, x, y, width, height);
      const contrast = brightness - surroundBrightness;

      if (contrast > 80 && contrast > maxContrast) {
        maxContrast = contrast;
        cursorX = x;
        cursorY = y;
        found = true;
      }
    }
  }

  return found ? { x: cursorX, y: cursorY } : null;
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function deduplicateEvents(events: ClickEvent[], minGapMs: number): ClickEvent[] {
  const sorted = events.slice().sort((a, b) => a.timestamp - b.timestamp);
  const out: ClickEvent[] = [];
  for (const ev of sorted) {
    const last = out[out.length - 1];
    if (!last || ev.timestamp - last.timestamp > minGapMs) out.push(ev);
  }
  return out;
}

function post(msg: WorkerResponse) {
  (self as unknown as Worker).postMessage(msg);
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  try {
    if (msg.type === "INIT") {
      config = msg.config;
      canvas = new OffscreenCanvas(config.analysisWidth, config.analysisHeight);
      ctx = canvas.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;

      prevCursor = null;
      prevCursor2 = null;
      lastClickTimeMs = -999999;
      rawEvents = [];
      return;
    }

    if (msg.type === "FRAME") {
      if (!config || !canvas || !ctx) throw new Error("Worker not initialized");

      const { frameIndex, timeMs, bitmap } = msg;

      ctx.clearRect(0, 0, config.analysisWidth, config.analysisHeight);
      ctx.drawImage(bitmap, 0, 0, config.analysisWidth, config.analysisHeight);
      bitmap.close();

      const imageData = ctx.getImageData(0, 0, config.analysisWidth, config.analysisHeight);
      const cursorPos = findCursorInFrame(imageData.data, config.analysisWidth, config.analysisHeight);

      if (cursorPos && prevCursor && prevCursor2) {
        const prevDist = distance(prevCursor2, prevCursor);
        const currDist = distance(prevCursor, cursorPos);
        const timeSinceLast = timeMs - lastClickTimeMs;

        // Click pattern: cursor was moving, then STOPPED suddenly.
        const cursorStopped = prevDist > config.cursorMoveThreshold && currDist < 4;
        const enoughTimeGap = timeSinceLast > config.minGapMs;

        if (cursorStopped && enoughTimeGap) {
          const confidence = Math.min(prevDist / 30, 1);
          if (confidence > config.confidenceThreshold) {
            const scaleX = config.videoWidth / config.analysisWidth;
            const scaleY = config.videoHeight / config.analysisHeight;
            rawEvents.push({
              id: makeId(),
              timestamp: timeMs,
              x: Math.round(prevCursor.x * scaleX),
              y: Math.round(prevCursor.y * scaleY),
              confidence,
              source: "AUTO_DETECTED",
              target: "AUTO_DETECTED",
            });
            lastClickTimeMs = timeMs;
          }
        }
      }

      // Update history: if cursor wasn't found this frame, keep previous positions.
      if (cursorPos) {
        prevCursor2 = prevCursor;
        prevCursor = cursorPos;
      }

      const frame = frameIndex + 1;
      const pct = Math.round((frame / Math.max(1, config.totalFrames)) * 100);

      post({
        type: "PROGRESS",
        frameIndex,
        frame,
        totalFrames: config.totalFrames,
        pct,
        foundCount: rawEvents.length,
      });

      return;
    }

    if (msg.type === "FINALIZE") {
      if (!config) throw new Error("Worker not initialized");
      const cfg = config;
      const filtered = rawEvents.filter((e) => e.confidence > cfg.confidenceThreshold);
      const deduped = deduplicateEvents(filtered, cfg.minGapMs);
      post({ type: "DONE", events: deduped });
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker error";
    post({ type: "ERROR", message });
  }
};

export {};
