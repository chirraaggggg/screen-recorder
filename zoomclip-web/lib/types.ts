export interface ClickEvent {
  id: string;
  /** Timestamp in milliseconds from start of video */
  timestamp: number;
  x: number;
  y: number;
  /** 0–1, how certain we are this is a real click (1 = manual / extension) */
  confidence: number;
  /** Label for where the click came from: 'EXTENSION' | 'AUTO_DETECTED' | 'MANUAL' */
  source: string;

  /** Optional debug label (e.g. DOM target like 'BUTTON#save' or 'AUTO_DETECTED') */
  target?: string;
}

export interface EditorSettings {
  zoomLevel: number;
  easeDuration: number;
  holdDuration: number;
  backgroundColor: string;
  cursorHighlight: boolean;
}

// Legacy/shared types (used by older components/utilities in this repo)
export type ZoomSettings = EditorSettings;

export type VideoFile = {
  file: File;
  duration: number; // seconds
  width: number;
  height: number;
  filename?: string;
};

export type ProcessingState = {
  status: "idle" | "processing" | "done" | "error";
  progress: number; // 0-100
  message?: string;
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
