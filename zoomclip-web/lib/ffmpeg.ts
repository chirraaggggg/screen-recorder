import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { ClickEvent, VideoFile, ZoomSettings } from "@/lib/types";
import { buildZoompanFilterString, DEFAULT_FPS } from "@/lib/zoom";

export type ProcessingProgress = {
  progress: number; // 0-100
  message: string;
};

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;
let progressListenerAttached = false;
let progressSink: ((ratio: number) => void) | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      await ffmpeg!.load({
        coreURL: await toBlobURL("/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("/ffmpeg-core.wasm", "application/wasm"),
      });
    })();
  }

  await ffmpegLoadPromise;

  if (!progressListenerAttached) {
    ffmpeg!.on("progress", ({ progress }: { progress: number }) => {
      if (progressSink) progressSink(progress);
    });
    progressListenerAttached = true;
  }

  return ffmpeg;
}

function formatSeconds(value: number): string {
  // keep it short to reduce argument size
  return value.toFixed(3);
}

function encodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

async function safeDeleteFile(ff: FFmpeg, path: string): Promise<void> {
  try {
    await ff.deleteFile(path);
  } catch {
    // ignore
  }
}

function makeChunkClickEvents(
  clickEvents: ClickEvent[],
  startMs: number,
  endMs: number
): ClickEvent[] {
  return clickEvents
    .filter((e) => e.timestamp >= startMs && e.timestamp < endMs)
    .map((e) => ({ ...e, timestamp: e.timestamp - startMs }));
}

export async function processVideoWithZoom(params: {
  video: VideoFile;
  clickEvents: ClickEvent[];
  settings: ZoomSettings;
  onProgress: (p: ProcessingProgress) => void;
}): Promise<Blob> {
  const ff = await getFFmpeg();

  const fps = DEFAULT_FPS;
  const duration = params.video.duration;

  const inputName = "input.webm";
  await safeDeleteFile(ff, inputName);

  params.onProgress({ progress: 1, message: "Loading video into processor…" });

  try {
    const inputData = await fetchFile(params.video.file);
    await ff.writeFile(inputName, inputData);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load input file.";
    throw new Error(message);
  }

  const isLong = duration > 5 * 60;
  const chunkSeconds = 30;

  // Progress handler is global per instance; update via sink per exec.
  let baseProgress = 0;
  let spanProgress = 1;

  const onProgressInternal = (ratio: number, label: string) => {
    const overall = (baseProgress + ratio * spanProgress) * 100;
    params.onProgress({
      progress: Math.max(0, Math.min(100, overall)),
      message: label,
    });
  };

  if (!isLong) {
    const outName = "output.mp4";
    await safeDeleteFile(ff, outName);

    const vf = buildZoompanFilterString({
      clickEvents: params.clickEvents,
      settings: params.settings,
      videoWidth: params.video.width,
      videoHeight: params.video.height,
      fps,
    });

    const label = "Processing…";

    progressSink = (ratio) => onProgressInternal(ratio, label);

    try {
      await ff.exec([
        "-i",
        inputName,
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        outName,
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "ffmpeg processing failed.";
      throw new Error(message);
    }

    params.onProgress({ progress: 99, message: "Finalizing…" });

    const out = (await ff.readFile(outName)) as Uint8Array;
    const bytes = new Uint8Array(out.byteLength);
    bytes.set(out);
    return new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
  }

  // Chunked processing
  const totalChunks = Math.max(1, Math.ceil(duration / chunkSeconds));
  const chunkNames: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const startSec = i * chunkSeconds;
    const endSec = Math.min(duration, startSec + chunkSeconds);
    const chunkDur = Math.max(0.001, endSec - startSec);

    const startMs = startSec * 1000;
    const endMs = endSec * 1000;

    const chunkClicks = makeChunkClickEvents(params.clickEvents, startMs, endMs);

    const vf = buildZoompanFilterString({
      clickEvents: chunkClicks,
      settings: params.settings,
      videoWidth: params.video.width,
      videoHeight: params.video.height,
      fps,
    });

    const outName = `chunk-${String(i).padStart(3, "0")}.mp4`;
    chunkNames.push(outName);
    await safeDeleteFile(ff, outName);

    const label = `Processing chunk ${i + 1} of ${totalChunks}…`;

    baseProgress = i / totalChunks;
    spanProgress = 1 / totalChunks;

    progressSink = (ratio) => onProgressInternal(ratio, label);

    try {
      await ff.exec([
        "-i",
        inputName,
        "-ss",
        formatSeconds(startSec),
        "-t",
        formatSeconds(chunkDur),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        outName,
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "ffmpeg chunk processing failed.";
      throw new Error(message);
    }
  }

  params.onProgress({ progress: 98, message: "Concatenating chunks…" });

  progressSink = null;

  const concatFile = "concat.txt";
  await safeDeleteFile(ff, concatFile);

  const concatText = chunkNames.map((n) => `file '${n}'`).join("\n");
  await ff.writeFile(concatFile, encodeText(concatText));

  const outName = "output.mp4";
  await safeDeleteFile(ff, outName);

  try {
    await ff.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFile,
      "-c",
      "copy",
      outName,
    ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to concatenate chunks.";
    throw new Error(message);
  }

  params.onProgress({ progress: 99, message: "Finalizing…" });

  const out = (await ff.readFile(outName)) as Uint8Array;
  const bytes = new Uint8Array(out.byteLength);
  bytes.set(out);

  // Cleanup large intermediates.
  for (const n of chunkNames) {
    await safeDeleteFile(ff, n);
  }
  await safeDeleteFile(ff, concatFile);

  return new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
}
