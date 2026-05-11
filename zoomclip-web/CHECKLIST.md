## Integration Test Checklist

### Extension
- [ ] Load extension at chrome://extensions
- [ ] Open http://example.com
- [ ] Click extension icon → popup shows
- [ ] Click Record → floating bar appears on page
- [ ] Click 3-5 times on the page
- [ ] Click Stop on floating bar
- [ ] Editor opens at localhost:3000/editor
- [ ] Click count matches expected

### Editor  
- [ ] Green banner shows correct click count
- [ ] Upload zone appears
- [ ] Drop .webm file → video loads
- [ ] State changes to 'ready' — 3-column layout
- [ ] Video plays with play button
- [ ] Timeline shows click markers (amber dots)
- [ ] Click a marker → video seeks to that time
- [ ] Canvas shows zoom during playback at click times
- [ ] Export → progress bar → download works

### Known issues to check
- [ ] COOP/COEP headers set (required for FFmpeg WASM)
- [ ] ffmpeg-core.js and .wasm in /public folder
- [ ] Extension permissions include 'tabCapture'
- [ ] content.js injected before click tracking starts
