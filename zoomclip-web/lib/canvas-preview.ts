import type { ZoomFrame, Background, Layout, CursorSettings } from './types';

function clipRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: Background,
  W: number,
  H: number
): void {
  switch (bg.type) {
    case 'color':
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, W, H);
      break;

    case 'gradient':
      const [color1, color2] = bg.gradient;
      const gradient = ctx.createLinearGradient(0, 0, W, H);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
      break;

    case 'wallpaper':
      if (bg.wallpaperUrl) {
        // Note: Drawing wallpaper from URL requires async image loading
        // For now, fill with color and the caller should handle wallpaper
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, W, H);
      }
      break;

    case 'none':
    default:
      // Transparent - do nothing
      ctx.clearRect(0, 0, W, H);
      break;
  }
}

export function renderPreviewFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  frame: ZoomFrame,
  settings: { background: Background; layout: Layout; cursor: CursorSettings }
): void {
  const canvas = ctx.canvas;
  const W = canvas.width;
  const H = canvas.height;

  const { background, layout, cursor } = settings;

  // Step 1: Clear canvas
  ctx.clearRect(0, 0, W, H);

  // Step 2: Draw background
  drawBackground(ctx, background, W, H);

  // Calculate video dimensions with padding
  const { padding, borderRadius, shadow, shadowBlur, shadowOpacity } = layout;
  const vw = W - padding * 2;
  const vh = H - padding * 2;
  const vx = padding;
  const vy = padding;

  // Step 3: Set shadow if enabled
  if (shadow) {
    ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Step 4: Clip to rounded rectangle
  ctx.save();
  clipRoundedRect(ctx, vx, vy, vw, vh, borderRadius);
  ctx.clip();

  // Step 5: Apply zoom transformation
  // Translate to zoom center, scale, translate back
  const { zoom, cx, cy } = frame;
  const centerX = vx + vw * cx;
  const centerY = vy + vh * cy;

  ctx.translate(centerX, centerY);
  ctx.scale(zoom, zoom);
  ctx.translate(-centerX, -centerY);

  // Step 6: Draw video
  // Handle case where video is not loaded
  if (video.readyState >= 2) {
    ctx.drawImage(video, vx, vy, vw, vh);
  } else {
    // Draw placeholder if video not ready
    ctx.fillStyle = '#000000';
    ctx.fillRect(vx, vy, vw, vh);
  }

  ctx.restore();

  // Step 7: Draw cursor highlight if enabled and zoomed
  if (cursor.highlight && zoom > 1.01) {
    const highlightX = vx + vw * cx;
    const highlightY = vy + vh * cy;

    ctx.save();
    ctx.beginPath();
    ctx.arc(highlightX, highlightY, cursor.size / 2, 0, Math.PI * 2);
    ctx.fillStyle = cursor.color;
    ctx.fill();

    // Draw a subtle ring
    ctx.beginPath();
    ctx.arc(highlightX, highlightY, cursor.size, 0, Math.PI * 2);
    ctx.strokeStyle = cursor.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
