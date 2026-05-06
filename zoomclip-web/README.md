# ZoomClip

Screen recorder with auto-zoom on every click. Chrome Extension + Next.js.

## Quick Start

### Web App
```bash
npm install
npm run dev
```
Open http://localhost:3000

### Chrome Extension
1. Open chrome://extensions
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the /extension folder

### FFmpeg WASM Setup (required for export)
```bash
mkdir -p public
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js public/
cp node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm public/
```

## How It Works
1. Click the extension → Record
2. Use your product — every click is tracked
3. Click Stop → editor opens automatically  
4. Click Export → MP4 downloads to your machine

## Tech Stack
- Next.js 14 (App Router)
- TypeScript strict
- Zustand (state)
- Canvas API (live preview)
- FFmpeg WASM (export, runs in browser)
- Chrome Extension MV3 (tabCapture)

## File Structure
```
/extension          Chrome extension files
/app                Next.js app
/components         React components  
/lib                Core logic (zoom engine, canvas, ffmpeg)
/store              Zustand store
/public             Static assets (ffmpeg WASM files)
```
