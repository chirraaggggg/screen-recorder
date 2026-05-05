import type { ClickEvent, ZoomSettings } from "@/lib/types";

export const DEFAULT_FPS = 30;

type ZoomSegment = {
  startFrame: number;
  easeFrames: number;
  holdFrames: number;
  peakFrame: number;
  endHold: number;
  endFrame: number;
  cx: number;
  cy: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toFrame(timestampMs: number, fps: number): number {
  return Math.max(0, Math.round((timestampMs / 1000) * fps));
}

function buildSegments(
  clickEvents: ClickEvent[],
  settings: ZoomSettings,
  videoWidth: number,
  videoHeight: number,
  fps: number,
  screenWidth: number,
  screenHeight: number
): ZoomSegment[] {
  const easeFrames = Math.max(1, Math.round((settings.easeDuration / 1000) * fps));
  const holdFrames = Math.max(1, Math.round((settings.holdDuration / 1000) * fps));

  return clickEvents
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((click) => {
      const startFrame = toFrame(click.timestamp, fps);
      const peakFrame = startFrame + easeFrames;
      const endHold = peakFrame + holdFrames;
      const endFrame = endHold + easeFrames;

      const cx = clamp(
        Math.round((click.x * videoWidth) / Math.max(1, screenWidth)),
        0,
        videoWidth
      );
      const cy = clamp(
        Math.round((click.y * videoHeight) / Math.max(1, screenHeight)),
        0,
        videoHeight
      );

      return {
        startFrame,
        easeFrames,
        holdFrames,
        peakFrame,
        endHold,
        endFrame,
        cx,
        cy,
      };
    });
}

function buildZExpr(segments: ZoomSegment[], zoomLevel: number): string {
  const zl = clamp(zoomLevel, 1, 3);
  const zDelta = zl - 1;

  let expr = "1";
  for (const seg of segments) {
    const s = seg.startFrame;
    const p = seg.peakFrame;
    const h = seg.endHold;
    const e = seg.endFrame;
    const ef = seg.easeFrames;

    const easeIn = `1+(${zDelta}*pow((on-${s})/${ef},3))`;
    const hold = `${zl}`;
    const easeOut = `1+(${zDelta}*pow(1-((on-${h})/${ef}),3))`;

    const segExpr =
      `if(between(on,${s},${p}),${easeIn},` +
      `if(between(on,${p},${h}),${hold},` +
      `if(between(on,${h},${e}),${easeOut},1)))`;

    expr = `if(between(on,${s},${e}),${segExpr},${expr})`;
  }

  return expr;
}

function buildXYExpr(
  segments: ZoomSegment[],
  axis: "x" | "y"
): string {
  // When not in a zoom segment, keep the camera centered.
  const centered = axis === "x" ? "(iw-iw/zoom)/2" : "(ih-ih/zoom)/2";

  let expr = centered;
  for (const seg of segments) {
    const s = seg.startFrame;
    const e = seg.endFrame;
    const c = axis === "x" ? seg.cx : seg.cy;

    const raw = axis === "x" ? `${c}-iw/(2*zoom)` : `${c}-ih/(2*zoom)`;
    const maxVal = axis === "x" ? "iw-iw/zoom" : "ih-ih/zoom";
    const clamped = `max(min(${raw},${maxVal}),0)`;

    expr = `if(between(on,${s},${e}),${clamped},${expr})`;
  }

  return expr;
}

function buildCursorHighlightEnable(segments: ZoomSegment[]): string {
  if (segments.length === 0) return "0";

  // drawbox enable expression uses the frame index `n`.
  // Any non-zero value enables the filter.
  return segments
    .map((s) => `between(n,${s.startFrame},${s.endHold})`)
    .join("+");
}

export function buildZoompanFilterString(params: {
  clickEvents: ClickEvent[];
  settings: ZoomSettings;
  videoWidth: number;
  videoHeight: number;
  fps?: number;
}): string {
  const fps = params.fps ?? DEFAULT_FPS;

  const screenWidth = typeof window !== "undefined" ? window.screen.width : 1920;
  const screenHeight = typeof window !== "undefined" ? window.screen.height : 1080;

  const segments = buildSegments(
    params.clickEvents,
    params.settings,
    params.videoWidth,
    params.videoHeight,
    fps,
    screenWidth,
    screenHeight
  );

  const z = buildZExpr(segments, params.settings.zoomLevel);
  const x = buildXYExpr(segments, "x");
  const y = buildXYExpr(segments, "y");

  const zoompan =
    `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${params.videoWidth}x${params.videoHeight}:fps=${fps}`;

  if (!params.settings.cursorHighlight) {
    return zoompan;
  }

  const enable = buildCursorHighlightEnable(segments);

  // Camera is centered on the click during zoom segments, so the cursor highlight sits at the center.
  const highlight =
    `drawbox=x=(iw/2)-28:y=(ih/2)-28:w=56:h=56:color=0x38d86f@0.25:t=4:enable='${enable}'`;

  return `${zoompan},${highlight}`;
}
