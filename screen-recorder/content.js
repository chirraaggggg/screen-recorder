// content.js — runs inside the recorded tab
// Captures precise click events relative to recording start time

let clickEvents = [];
let recordingStartTime = null;

function captureClick(e) {
  if (!recordingStartTime) return;
  const timestampMs = Math.round(performance.now() - recordingStartTime);
  clickEvents.push({
    timestamp: timestampMs,           // ms from recording start
    x: e.clientX,
    y: e.clientY,
    target: e.target.tagName + (e.target.id ? '#' + e.target.id : ''),
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_RECORDING') {
    recordingStartTime = performance.now();
    clickEvents = [];
    document.addEventListener('click', captureClick, true);
    document.addEventListener('mousedown', captureClick, true);
    console.log('[ZoomClip] Recording started — click capture active');
  }

  if (msg.type === 'STOP_RECORDING') {
    document.removeEventListener('click', captureClick, true);
    document.removeEventListener('mousedown', captureClick, true);

    // Deduplicate: mousedown + click fire together — keep one per ~50ms window
    const deduped = [];
    for (const ev of clickEvents) {
      const last = deduped[deduped.length - 1];
      if (!last || ev.timestamp - last.timestamp > 50) {
        deduped.push(ev);
      }
    }

    console.log(`[ZoomClip] Recording stopped — ${deduped.length} clicks captured`);

    chrome.runtime.sendMessage({
      type: 'CLICK_EVENTS_READY',
      payload: deduped,
    });
  }
});
