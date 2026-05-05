import { ClickEvent } from './types';

type WorkerProgressMessage = {
  type: 'PROGRESS';
  frameIndex: number;
  frame: number;
  totalFrames: number;
  pct: number;
  foundCount: number;
};

type WorkerDoneMessage = {
  type: 'DONE';
  events: ClickEvent[];
};

type WorkerErrorMessage = {
  type: 'ERROR';
  message: string;
};

type WorkerResponse = WorkerProgressMessage | WorkerDoneMessage | WorkerErrorMessage;

// ─── Config ──────────────────────────────────────────────────────────────────
const SAMPLE_INTERVAL_MS = 50;       // analyze every 50ms
const CURSOR_MOVE_THRESHOLD = 8;     // px — how much cursor must move before a stop = click
const MIN_GAP_MS = 600;              // ms — minimum gap between detected clicks
const CONFIDENCE_THRESHOLD = 0.3;   // discard low-confidence events
const ANALYSIS_WIDTH = 960;         // downscale width for performance

// ─── Helpers ─────────────────────────────────────────────────────────────────
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise(resolve => {
    if (Math.abs(video.currentTime - time) < 0.01) { resolve(); return; }
    const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

// ─── Detection Progress State ────────────────────────────────────────────────
export interface DetectionState {
  frame: number;
  totalFrames: number;
  pct: number;
  foundCount: number;
}

// ─── Main detection function ─────────────────────────────────────────────────
export async function detectClicksFromVideo(
  videoElement: HTMLVideoElement,
  onProgress: (state: DetectionState) => void
): Promise<ClickEvent[]> {
  const ANALYSIS_HEIGHT = Math.round(
    videoElement.videoHeight * (ANALYSIS_WIDTH / videoElement.videoWidth)
  );

  const durationMs = videoElement.duration * 1000;
  const totalFrames = Math.floor(durationMs / SAMPLE_INTERVAL_MS);

  const worker = new Worker(new URL('./clickDetectionWorker.ts', import.meta.url), { type: 'module' });

  const pendingFrameAcks = new Map<number, () => void>();
  let doneResolve: ((events: ClickEvent[]) => void) | null = null;
  let doneReject: ((err: unknown) => void) | null = null;
  let fatalError: Error | null = null;

  const donePromise = new Promise<ClickEvent[]>((resolve, reject) => {
    doneResolve = resolve;
    doneReject = reject;
  });

  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;

    if (msg.type === 'PROGRESS') {
      onProgress({
        frame: msg.frame,
        totalFrames: msg.totalFrames,
        pct: msg.pct,
        foundCount: msg.foundCount,
      });
      const ack = pendingFrameAcks.get(msg.frameIndex);
      if (ack) {
        pendingFrameAcks.delete(msg.frameIndex);
        ack();
      }
      return;
    }

    if (msg.type === 'DONE') {
      doneResolve?.(msg.events);
      return;
    }

    if (msg.type === 'ERROR') {
      fatalError = new Error(msg.message);
      // Release any awaits in the seek loop to prevent deadlocks.
      for (const [, ack] of pendingFrameAcks) ack();
      pendingFrameAcks.clear();
      doneReject?.(fatalError);
      return;
    }
  };

  // Mute the video element to prevent audio blipping during seek loop
  const wasMuted = videoElement.muted;
  videoElement.muted = true;

  try {
    worker.postMessage({
      type: 'INIT',
      config: {
        analysisWidth: ANALYSIS_WIDTH,
        analysisHeight: ANALYSIS_HEIGHT,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        totalFrames,
        sampleIntervalMs: SAMPLE_INTERVAL_MS,
        cursorMoveThreshold: CURSOR_MOVE_THRESHOLD,
        minGapMs: MIN_GAP_MS,
        confidenceThreshold: CONFIDENCE_THRESHOLD,
      },
    });

    onProgress({ frame: 0, totalFrames, pct: 0, foundCount: 0 });

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (fatalError) throw fatalError;

      const timeMs = frameIndex * SAMPLE_INTERVAL_MS;
      await seekTo(videoElement, timeMs / 1000);

      let bitmap: ImageBitmap;
      try {
        // Resize at source when supported to reduce transfer cost
        const createImageBitmapWithResize = createImageBitmap as unknown as (
          image: CanvasImageSource,
          options?: unknown
        ) => Promise<ImageBitmap>;

        bitmap = await createImageBitmapWithResize(videoElement, {
          resizeWidth: ANALYSIS_WIDTH,
          resizeHeight: ANALYSIS_HEIGHT,
          resizeQuality: 'high',
        });
      } catch {
        bitmap = await createImageBitmap(videoElement);
      }

      const ackPromise = new Promise<void>((resolve) => pendingFrameAcks.set(frameIndex, resolve));
      worker.postMessage(
        { type: 'FRAME', frameIndex, timeMs, bitmap },
        // Transfer bitmap ownership to worker
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [bitmap as any]
      );

      await ackPromise;

      // Yield to browser periodically so UI stays responsive (seeking can still be heavy)
      if (frameIndex % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    worker.postMessage({ type: 'FINALIZE' });
    const result = await donePromise;

    // ── Debug output requested ────────────────────────────────────────────────
    console.table(result.map(e => ({
      'Time':       `${(e.timestamp / 1000).toFixed(2)}s`,
      'X':          e.x,
      'Y':          e.y,
      'Confidence': `${Math.round(e.confidence * 100)}%`,
      'Source':     e.source,
      'Target':     e.target,
    })));

    return result;
  } finally {
    videoElement.muted = wasMuted;
    worker.terminate();
  }
}
