import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { timelineToFFmpegFilter } from './zoom-engine';
import type {
  ZoomFrame,
  Layout,
  ExportSettings,
  Resolution,
  ExportQuality,
} from './types';

const RESOLUTION_MAP: Record<Resolution, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

const CRF_MAP: Record<ExportQuality, number> = {
  low: 28,
  medium: 23,
  high: 18,
  lossless: 0,
};

export async function exportVideo(
  videoFile: File,
  zoomFrames: ZoomFrame[],
  layoutSettings: Layout,
  exportSettings: ExportSettings,
  videoWidth: number,
  videoHeight: number,
  onProgress: (pct: number, frame: number, total: number, eta: number) => void
): Promise<Blob> {
  // Calculate duration from zoomFrames
  const totalFrames = zoomFrames.length;
  const durationMs = (totalFrames / exportSettings.fps) * 1000;

  // Create FFmpeg instance
  const ffmpeg = new FFmpeg();

  // Set up progress listener
  ffmpeg.on('progress', (progress: { progress: number; time?: number }) => {
    const pct = Math.round(progress.progress * 100);
    // Estimate current frame from progress
    const estimatedFrame = Math.round(progress.progress * totalFrames);
    // Estimate ETA based on progress rate
    const eta = progress.time ? Math.round((progress.time / progress.progress - progress.time) / 1000) : 0;
    onProgress(pct, estimatedFrame, totalFrames, eta);
  });

  // Load FFmpeg with local files (required for SharedArrayBuffer/COOP/COEP)
  await ffmpeg.load({
    coreURL: '/ffmpeg-core.js',
    wasmURL: '/ffmpeg-core.wasm',
  });

  // Write input file
  const inputName = 'input.mp4';
  const inputData = await fetchFile(videoFile);
  await ffmpeg.writeFile(inputName, inputData);

  // Generate zoom filter
  const zoomFilter = timelineToFFmpegFilter(
    zoomFrames,
    videoWidth,
    videoHeight,
    exportSettings.fps
  );

  // Get target resolution
  const targetRes = RESOLUTION_MAP[exportSettings.resolution];

  // Calculate padding to maintain aspect ratio (letterbox if needed)
  const videoAspect = videoWidth / videoHeight;
  const targetAspect = targetRes.width / targetRes.height;

  let padFilter = '';
  if (videoAspect > targetAspect) {
    // Video is wider - pad height
    const newHeight = Math.round(targetRes.width / videoAspect);
    const padY = Math.round((targetRes.height - newHeight) / 2);
    padFilter = `,pad=${targetRes.width}:${targetRes.height}:0:${padY}:black`;
  } else if (videoAspect < targetAspect) {
    // Video is taller - pad width
    const newWidth = Math.round(targetRes.height * videoAspect);
    const padX = Math.round((targetRes.width - newWidth) / 2);
    padFilter = `,pad=${targetRes.width}:${targetRes.height}:${padX}:0:black`;
  }

  // Scale to target resolution if video matches target aspect ratio
  const scaleFilter = `,scale=${targetRes.width}:${targetRes.height}:force_original_aspect_ratio=decrease`;

  // Build complete filter complex
  // zoompan first, then scale, then pad
  const filterComplex = `${zoomFilter}${scaleFilter}${padFilter}`;

  // Get CRF value
  const crf = CRF_MAP[exportSettings.quality];

  // Build FFmpeg command
  const outputName = `output.${exportSettings.format}`;
  const args: string[] = [
    '-i', inputName,
    '-vf', filterComplex,
    '-r', exportSettings.fps.toString(),
  ];

  // Add audio handling
  if (!exportSettings.includeAudio) {
    args.push('-an');
  } else {
    args.push('-c:a', 'copy');
  }

  // Add quality settings
  if (exportSettings.format === 'mp4') {
    args.push('-c:v', 'libx264');
    args.push('-crf', crf.toString());
    args.push('-preset', 'fast');
    args.push('-pix_fmt', 'yuv420p');
    args.push('-movflags', '+faststart');
  } else if (exportSettings.format === 'gif') {
    args.push('-c:v', 'gif');
    args.push('-b:v', exportSettings.quality === 'lossless' ? '2M' : '1M');
  }

  // Add output
  args.push('-y', outputName);

  // Execute FFmpeg
  await ffmpeg.exec(args);

  // Read output file
  const outputData = await ffmpeg.readFile(outputName);

  // Clean up files
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // Ignore cleanup errors
  }

  // Convert to Blob (cast through unknown to handle ArrayBufferLike type)
  const blob = new Blob([outputData as unknown as Uint8Array], {
    type: exportSettings.format === 'mp4' ? 'video/mp4' : 'image/gif',
  });

  return blob;
}
