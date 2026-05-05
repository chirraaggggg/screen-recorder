// content.js — injected into the recorded tab on demand
// Captures BOTH mousedown + click (deduplicated) for maximum accuracy.
// Keeps its own clickEvents array and sends it to the background when recording stops.

let isTracking = false;

let recordingStartPerf = 0;      // performance.now() when tracking started
let pausedAtPerf: number | null = null;
let pausedAccumMs = 0;

let clickEvents: Array<{ timestamp: number; x: number; y: number; target: string }> = [];
const recentTimestamps: number[] = []; // for deduplication

// ─── Safe Send ───────────────────────────────────────────────────────────────
async function safeRuntimeSend(message) {
  try { await chrome.runtime.sendMessage(message); } catch (_) {}
}

// ─── Click Handler ───────────────────────────────────────────────────────────
function onClickEvent(event) {
  if (!isTracking) return;

  const now = performance.now();
  const tsMs = Math.round(now - recordingStartPerf - pausedAccumMs);

  // Deduplicate: mousedown + click fire within ~20ms of each other — keep only one
  const isDupe = recentTimestamps.some(t => Math.abs(t - tsMs) < 30);
  if (isDupe) return;
  recentTimestamps.push(tsMs);
  // Keep buffer small
  if (recentTimestamps.length > 20) recentTimestamps.shift();

  const payload = {
    timestamp: tsMs,                                              // ms since recording started
    x: event.clientX,
    y: event.clientY,
    target: (event.target?.tagName || 'UNKNOWN') +
            (event.target?.id ? '#' + event.target.id : ''),
  };

  clickEvents.push(payload);
  // Still stream click count updates to popup while recording.
  safeRuntimeSend({ type: 'CLICK_EVENT', payload });
}

// ─── Tracking Control ────────────────────────────────────────────────────────
function startTracking() {
  if (isTracking) return;
  isTracking = true;
  recordingStartPerf = performance.now();
  pausedAtPerf = null;
  pausedAccumMs = 0;
  clickEvents = [];
  recentTimestamps.length = 0;
  // capture:true — fires before any other handler, cannot be stopped by stopPropagation
  window.addEventListener('mousedown', onClickEvent, true);
  window.addEventListener('click', onClickEvent, true);
}

function stopTracking() {
  isTracking = false;
  pausedAtPerf = null;
  window.removeEventListener('mousedown', onClickEvent, true);
  window.removeEventListener('click', onClickEvent, true);

  // Send the full list to background (authoritative)
  safeRuntimeSend({ type: 'CLICK_EVENTS_READY', payload: clickEvents });
}

function pauseTracking() {
  isTracking = false;
  if (pausedAtPerf === null) pausedAtPerf = performance.now();
}

function resumeTracking() {
  const now = performance.now();
  if (pausedAtPerf !== null) {
    pausedAccumMs += now - pausedAtPerf;
    pausedAtPerf = null;
  }
  isTracking = true;
}

// ─── Message Listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'PING') {
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'START_TRACKING') {
    startTracking();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'STOP_TRACKING') {
    stopTracking();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'PAUSE_TRACKING') {
    pauseTracking();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'RESUME_TRACKING') {
    resumeTracking();
    sendResponse({ ok: true });
    return;
  }
});
