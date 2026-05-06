import { create } from 'zustand';
import type {
  ClickEvent,
  ZoomFrame,
  Background,
  Layout,
  ZoomSettings,
  CursorSettings,
  Watermark,
  ExportSettings,
  ProcessingState,
  EditorState,
} from '@/lib/types';

interface EditorStore {
  // State fields
  editorState: EditorState;
  videoFile: File | null;
  videoUrl: string | null;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  currentTime: number;
  isPlaying: boolean;
  clickEvents: ClickEvent[];
  zoomFrames: ZoomFrame[];
  background: Background;
  layout: Layout;
  zoom: ZoomSettings;
  cursor: CursorSettings;
  watermark: Watermark;
  exportSettings: ExportSettings;
  processing: ProcessingState;

  // Action functions
  setVideo: (file: File, url: string, duration: number, width: number, height: number) => void;
  setClickEvents: (events: ClickEvent[]) => void;
  addClickEvent: (event: ClickEvent) => void;
  removeClickEvent: (index: number) => void;
  updateClickEvent: (index: number, event: Partial<ClickEvent>) => void;
  setZoomFrames: (frames: ZoomFrame[]) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setEditorState: (state: EditorState) => void;
  setBackground: (bg: Partial<Background>) => void;
  setLayout: (layout: Partial<Layout>) => void;
  setZoom: (zoom: Partial<ZoomSettings>) => void;
  setCursor: (cursor: Partial<CursorSettings>) => void;
  setWatermark: (watermark: Partial<Watermark>) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setProcessing: (processing: Partial<ProcessingState>) => void;
  reset: () => void;
}

const defaultBackground: Background = {
  type: 'wallpaper',
  color: '#1a1a2e',
  gradient: ['#1a1a2e', '#16213e'],
  wallpaperUrl: null,
};

const defaultLayout: Layout = {
  padding: 40,
  borderRadius: 12,
  shadow: true,
  shadowBlur: 40,
  shadowOpacity: 0.5,
};

const defaultZoom: ZoomSettings = {
  level: 1.8,
  speed: 'smooth',
  holdDuration: 800,
  easeIn: 300,
  easeOut: 300,
};

const defaultCursor: CursorSettings = {
  highlight: true,
  size: 20,
  color: 'rgba(255,255,255,0.8)',
};

const defaultWatermark: Watermark = {
  enabled: false,
  imageUrl: null,
  position: 'br',
  opacity: 0.5,
};

const defaultExportSettings: ExportSettings = {
  resolution: '1080p',
  format: 'mp4',
  quality: 'high',
  fps: 60,
  includeAudio: true,
};

const defaultProcessing: ProcessingState = {
  status: 'idle',
  progress: 0,
  message: '',
  frame: 0,
  totalFrames: 0,
  eta: 0,
  outputUrl: null,
};

const initialState = {
  editorState: 'empty' as EditorState,
  videoFile: null,
  videoUrl: null,
  videoDuration: 0,
  videoWidth: 0,
  videoHeight: 0,
  currentTime: 0,
  isPlaying: false,
  clickEvents: [],
  zoomFrames: [],
  background: defaultBackground,
  layout: defaultLayout,
  zoom: defaultZoom,
  cursor: defaultCursor,
  watermark: defaultWatermark,
  exportSettings: defaultExportSettings,
  processing: defaultProcessing,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  setVideo: (file, url, duration, width, height) => {
    const { clickEvents } = get();
    const newState: EditorState = clickEvents.length > 0 ? 'ready' : 'empty';

    set({
      videoFile: file,
      videoUrl: url,
      videoDuration: duration,
      videoWidth: width,
      videoHeight: height,
      editorState: newState,
      background: {
        ...get().background,
        wallpaperUrl: url,
      },
    });
  },

  setClickEvents: (events) => {
    const { videoFile } = get();
    const newState: EditorState = videoFile ? 'ready' : 'clicks-only';

    set({
      clickEvents: events,
      editorState: newState,
    });
  },

  addClickEvent: (event) => {
    const { clickEvents, videoFile } = get();
    const newEvents = [...clickEvents, event];
    const newState: EditorState = videoFile ? 'ready' : 'clicks-only';

    set({
      clickEvents: newEvents,
      editorState: newState,
    });
  },

  removeClickEvent: (index) => {
    const { clickEvents, videoFile } = get();
    const newEvents = clickEvents.filter((_, i) => i !== index);
    let newState: EditorState = 'empty';

    if (videoFile && newEvents.length > 0) {
      newState = 'ready';
    } else if (videoFile) {
      newState = 'empty';
    } else if (newEvents.length > 0) {
      newState = 'clicks-only';
    }

    set({
      clickEvents: newEvents,
      editorState: newState,
    });
  },

  updateClickEvent: (index, event) => {
    const { clickEvents } = get();
    const newEvents = clickEvents.map((e, i) =>
      i === index ? { ...e, ...event } : e
    );
    set({ clickEvents: newEvents });
  },

  setZoomFrames: (frames) => {
    set({ zoomFrames: frames });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  setEditorState: (state) => {
    set({ editorState: state });
  },

  setBackground: (bg) => {
    set({ background: { ...get().background, ...bg } });
  },

  setLayout: (layout) => {
    set({ layout: { ...get().layout, ...layout } });
  },

  setZoom: (zoom) => {
    set({ zoom: { ...get().zoom, ...zoom } });
  },

  setCursor: (cursor) => {
    set({ cursor: { ...get().cursor, ...cursor } });
  },

  setWatermark: (watermark) => {
    set({ watermark: { ...get().watermark, ...watermark } });
  },

  setExportSettings: (settings) => {
    set({ exportSettings: { ...get().exportSettings, ...settings } });
  },

  setProcessing: (processing) => {
    set({ processing: { ...get().processing, ...processing } });
  },

  reset: () => {
    const { videoUrl } = get();
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    set({
      ...initialState,
      background: defaultBackground,
      layout: defaultLayout,
      zoom: defaultZoom,
      cursor: defaultCursor,
      watermark: defaultWatermark,
      exportSettings: defaultExportSettings,
      processing: defaultProcessing,
    });
  },
}));
