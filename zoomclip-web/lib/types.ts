export interface ClickEvent {
  timestamp: number   // ms from recording start
  x: number           // clientX in original screen pixels
  y: number           // clientY in original screen pixels
  target: string      // tagName of clicked element
  screenWidth: number   // window.screen.width at time of click
  screenHeight: number  // window.screen.height at time of click
}

export interface ZoomFrame {
  frame: number
  zoom: number        // 1.0 = no zoom
  cx: number          // center X as ratio 0-1
  cy: number          // center Y as ratio 0-1
}

export interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

export type ZoomSpeed = 'smooth' | 'snappy' | 'instant'

export interface ZoomSettings {
  level: number
  speed: ZoomSpeed
  holdDuration: number   // ms
  easeIn: number         // ms
  easeOut: number        // ms
}

export type BackgroundType = 'wallpaper' | 'color' | 'gradient' | 'none'

export interface Background {
  type: BackgroundType
  color: string
  gradient: [string, string]
  wallpaperUrl: string | null
}

export interface Layout {
  padding: number
  borderRadius: number
  shadow: boolean
  shadowBlur: number
  shadowOpacity: number
}

export interface CursorSettings {
  highlight: boolean
  size: number
  color: string
}

export interface Watermark {
  enabled: boolean
  imageUrl: string | null
  position: 'tl' | 'tr' | 'bl' | 'br' | 'center'
  opacity: number
}

export type Resolution = '720p' | '1080p' | '4k'
export type ExportFormat = 'mp4' | 'gif'
export type ExportQuality = 'low' | 'medium' | 'high' | 'lossless'
export type ExportFps = 30 | 60

export interface ExportSettings {
  resolution: Resolution
  format: ExportFormat
  quality: ExportQuality
  fps: ExportFps
  includeAudio: boolean
}

export type EditorState = 'empty' | 'clicks-only' | 'ready' | 'processing' | 'done'
export type ProcessingStatus = 'idle' | 'processing' | 'done' | 'error'

export interface ProcessingState {
  status: ProcessingStatus
  progress: number
  message: string
  frame: number
  totalFrames: number
  eta: number
  outputUrl: string | null
}

// Legacy/shared types (kept for compatibility)
export interface EditorSettings {
  zoomLevel: number;
  easeDuration: number;
  holdDuration: number;
  backgroundColor: string;
  cursorHighlight: boolean;
}

export type VideoFile = {
  file: File;
  duration: number; // seconds
  width: number;
  height: number;
  filename?: string;
};

export interface VideoMetadata {
  filename: string;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
}

export interface ExtensionMessage {
  type: string;
  videoBlob?: Blob;
  clickEvents?: { timestamp: number; x: number; y: number; target?: string }[];
}
