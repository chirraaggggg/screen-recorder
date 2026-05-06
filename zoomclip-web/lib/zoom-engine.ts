import type { ClickEvent, ZoomFrame, SpringConfig, ZoomSettings, ZoomSpeed } from './types';

export const SPRING_PRESETS: Record<ZoomSpeed, SpringConfig> = {
  smooth: { stiffness: 180, damping: 22, mass: 1 },
  snappy: { stiffness: 280, damping: 30, mass: 1 },
  instant: { stiffness: 2000, damping: 200, mass: 1 },
};

export function simulateSpring(
  from: number,
  to: number,
  config: SpringConfig,
  fps: number
): number[] {
  const dt = 1 / fps;
  const values: number[] = [];
  let current = from;
  let velocity = 0;
  const { stiffness, damping, mass } = config;

  // Safety limit to prevent infinite loops
  const maxIterations = fps * 10;
  let iterations = 0;

  while (iterations < maxIterations) {
    const force = -stiffness * (current - to);
    const dampingForce = -damping * velocity;
    const acceleration = (force + dampingForce) / mass;

    velocity += acceleration * dt;
    current += velocity * dt;
    values.push(current);

    // Stop when close to target and velocity is near zero
    if (Math.abs(current - to) < 0.0001 && Math.abs(velocity) < 0.0001) {
      break;
    }

    iterations++;
  }

  return values;
}

export function generateZoomTimeline(
  clickEvents: ClickEvent[],
  settings: ZoomSettings,
  durationMs: number,
  fps = 60
): ZoomFrame[] {
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const frames: ZoomFrame[] = [];

  // Initialize with default (no zoom, center)
  for (let i = 0; i < totalFrames; i++) {
    frames.push({ frame: i, zoom: 1.0, cx: 0.5, cy: 0.5 });
  }

  if (clickEvents.length === 0) {
    return frames;
  }

  const { level, speed, holdDuration, easeIn, easeOut } = settings;
  const springConfig = SPRING_PRESETS[speed];

  for (const click of clickEvents) {
    const clickFrame = Math.floor((click.timestamp / 1000) * fps);
    const cx = click.x / click.screenWidth;
    const cy = click.y / click.screenHeight;

    // Calculate spring animations
    const zoomInFrames = Math.floor((easeIn / 1000) * fps);
    const zoomOutFrames = Math.floor((easeOut / 1000) * fps);
    const holdFrames = Math.floor((holdDuration / 1000) * fps);

    // Zoom in spring (1.0 -> level)
    const zoomInSpring = simulateSpring(1.0, level, springConfig, fps);
    const actualZoomInFrames = Math.min(zoomInSpring.length, zoomInFrames);

    // Zoom out spring (level -> 1.0)
    const zoomOutSpring = simulateSpring(level, 1.0, springConfig, fps);
    const actualZoomOutFrames = Math.min(zoomOutSpring.length, zoomOutFrames);

    // Apply zoom in
    for (let i = 0; i < actualZoomInFrames; i++) {
      const frameIdx = clickFrame + i;
      if (frameIdx >= 0 && frameIdx < totalFrames) {
        frames[frameIdx].zoom = zoomInSpring[i];
        frames[frameIdx].cx = cx;
        frames[frameIdx].cy = cy;
      }
    }

    // Apply hold
    const holdStartFrame = clickFrame + actualZoomInFrames;
    for (let i = 0; i < holdFrames; i++) {
      const frameIdx = holdStartFrame + i;
      if (frameIdx >= 0 && frameIdx < totalFrames) {
        frames[frameIdx].zoom = level;
        frames[frameIdx].cx = cx;
        frames[frameIdx].cy = cy;
      }
    }

    // Apply zoom out
    const zoomOutStartFrame = holdStartFrame + holdFrames;
    for (let i = 0; i < actualZoomOutFrames; i++) {
      const frameIdx = zoomOutStartFrame + i;
      if (frameIdx >= 0 && frameIdx < totalFrames) {
        frames[frameIdx].zoom = zoomOutSpring[i];
        frames[frameIdx].cx = cx;
        frames[frameIdx].cy = cy;
      }
    }
  }

  return frames;
}

export function timelineToFFmpegFilter(
  frames: ZoomFrame[],
  videoWidth: number,
  videoHeight: number,
  fps: number
): string {
  // Build zoompan expression
  // Format: zoompan=z='if(...)' ...
  // We'll use enable expressions for each keyframe

  const keyframes: { frame: number; zoom: number; cx: number; cy: number }[] = [];

  // Only emit keyframes where values change significantly
  let lastZoom = -999;
  let lastCx = -999;
  let lastCy = -999;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const zoomDiff = Math.abs(f.zoom - lastZoom);
    const cxDiff = Math.abs(f.cx - lastCx);
    const cyDiff = Math.abs(f.cy - lastCy);

    if (zoomDiff > 0.001 || cxDiff > 0.001 || cyDiff > 0.001) {
      keyframes.push({
        frame: i,
        zoom: f.zoom,
        cx: f.cx,
        cy: f.cy,
      });
      lastZoom = f.zoom;
      lastCx = f.cx;
      lastCy = f.cy;
    }
  }

  if (keyframes.length === 0) {
    return 'zoompan=z=1.0:x=0:y=0:d=1';
  }

  // Build the filter expression
  // zoompan filter syntax: zoompan=z=expr:x=expr:y=expr:d=duration
  // We use enable expressions to switch between states

  const parts: string[] = [];

  // Simpler approach: use zoompan with evaluation at each frame
  // z='min(max(zoom_expression, 1.0), 4.0)' - limit zoom to sane bounds
  // x='(iw-iw/zoom)*cx' - pan to center point
  // y='(ih-ih/zoom)*cy'

  // Build interpolation expressions
  const zoomExpr = buildZoomExpression(keyframes, fps);
  const xExpr = buildPanExpression(keyframes, 'x', videoWidth, fps);
  const yExpr = buildPanExpression(keyframes, 'y', videoHeight, fps);

  // Calculate duration in frames
  const duration = frames.length;

  return `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${duration}`;
}

function buildZoomExpression(
  keyframes: { frame: number; zoom: number }[],
  fps: number
): string {
  if (keyframes.length === 0) return '1.0';
  if (keyframes.length === 1) return keyframes[0].zoom.toFixed(4);

  // Build if-else chain for frame-based zoom
  // Each segment interpolates between keyframes
  const parts: string[] = [];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    const startFrame = k1.frame;
    const endFrame = k2.frame;
    const startZoom = k1.zoom;
    const endZoom = k2.zoom;
    const duration = endFrame - startFrame;

    if (duration > 0) {
      // Linear interpolation: start + (end - start) * (n - startFrame) / duration
      const expr = `(${startZoom}+(${endZoom}-${startZoom})*(n-${startFrame})/${duration})`;

      if (i === 0) {
        parts.push(`if(n<${endFrame},${expr}`);
      } else if (i === keyframes.length - 2) {
        parts.push(`,${endZoom})`);
      } else {
        parts.push(`,if(n<${endFrame},${expr}`);
      }
    }
  }

  return parts.join('');
}

function buildPanExpression(
  keyframes: { frame: number; cx: number; cy: number }[],
  axis: 'x' | 'y',
  dimension: number,
  fps: number
): string {
  if (keyframes.length === 0) return axis === 'x' ? '(iw-iw/zoom)*0.5' : '(ih-ih/zoom)*0.5';

  const coordKey = axis === 'x' ? 'cx' : 'cy';
  const dimKey = axis === 'x' ? 'iw' : 'ih';

  if (keyframes.length === 1) {
    const c = keyframes[0][coordKey];
    return `(${dimKey}-${dimKey}/zoom)*${c.toFixed(4)}`;
  }

  // Build if-else chain for frame-based panning
  const parts: string[] = [];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    const startFrame = k1.frame;
    const endFrame = k2.frame;
    const startC = k1[coordKey];
    const endC = k2[coordKey];
    const duration = endFrame - startFrame;

    if (duration > 0) {
      // (dimension - dimension/zoom) * c
      // Where c interpolates between start and end
      const cExpr = `(${startC}+(${endC}-${startC})*(n-${startFrame})/${duration})`;
      const fullExpr = `(${dimKey}-${dimKey}/zoom)*${cExpr}`;

      if (i === 0) {
        parts.push(`if(n<${endFrame},${fullExpr}`);
      } else if (i === keyframes.length - 2) {
        const finalExpr = `(${dimKey}-${dimKey}/zoom)*${endC.toFixed(4)}`;
        parts.push(`,${finalExpr})`);
      } else {
        parts.push(`,if(n<${endFrame},${fullExpr}`);
      }
    }
  }

  // Close all if statements
  const closeParens = ')'.repeat(Math.max(0, keyframes.length - 2));

  return parts.join('') + (keyframes.length > 2 ? closeParens : '');
}

export function getZoomAtTime(
  frames: ZoomFrame[],
  timeMs: number,
  fps: number
): ZoomFrame {
  const frameIdx = Math.floor((timeMs / 1000) * fps);

  if (frameIdx < 0) {
    return { frame: 0, zoom: 1.0, cx: 0.5, cy: 0.5 };
  }

  if (frameIdx >= frames.length) {
    const last = frames[frames.length - 1];
    return last || { frame: frameIdx, zoom: 1.0, cx: 0.5, cy: 0.5 };
  }

  return frames[frameIdx];
}
