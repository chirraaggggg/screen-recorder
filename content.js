// content.js — injected into the recorded tab on demand
// Does NOT auto-start. Waits for START_TRACKING message from background.js

let isTracking        = false;
let recordingStartTime = null;

// ─── Safe Send ───────────────────────────────────────────────────────────────
async function safeRuntimeSend(message) {
  try { await chrome.runtime.sendMessage(message); } catch (_) {}
}

// ─── Click Handler ───────────────────────────────────────────────────────────
function onClick(event) {
  if (!isTracking || recordingStartTime === null) return;

  const payload = {
    timestamp: performance.now() - recordingStartTime, // ms since recording started
    x:         event.clientX,
    y:         event.clientY,
    target:    event.target?.tagName || "UNKNOWN"
  };

  safeRuntimeSend({ type: "CLICK_EVENT", payload });
}

// ─── Tracking Control ────────────────────────────────────────────────────────
function startTracking() {
  if (isTracking) return; // guard — never double-attach
  isTracking         = true;
  recordingStartTime = performance.now();
  // capture:true = fires before any other handler, can't be stopped by stopPropagation
  window.addEventListener("click", onClick, true);
}

function stopTracking() {
  isTracking         = false;
  recordingStartTime = null;
  window.removeEventListener("click", onClick, true);
}

function pauseTracking() {
  // Keep listener attached but stop logging clicks
  isTracking = false;
}

function resumeTracking() {
  if (!recordingStartTime) recordingStartTime = performance.now();
  isTracking = true;
}

// ─── Message Listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "PING") {
    // Lets background know this script is already loaded
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "START_TRACKING") {
    startTracking();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "STOP_TRACKING") {
    stopTracking();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "PAUSE_TRACKING") {
    pauseTracking();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "RESUME_TRACKING") {
    resumeTracking();
    sendResponse({ ok: true });
    return;
  }
});
