const OFFSCREEN_URL  = "offscreen.html";
const KEEP_ALIVE_MS  = 20000;

let recording      = false;
let isPaused       = false;
let activeTabId    = null;
let clickEvents    = [];
let keepAliveTimer = null;

// ─── Safe Wrappers ───────────────────────────────────────────────────────────
async function safeRuntimeSend(message) {
  try { await chrome.runtime.sendMessage(message); } catch (_) {}
}

async function safeTabSend(tabId, message) {
  if (tabId === null || tabId === undefined) return;
  try { await chrome.tabs.sendMessage(tabId, message); } catch (_) {}
}

async function safeStorageSet(values) {
  try { await chrome.storage.local.set(values); } catch (_) {}
}

async function safeStorageClear() {
  try { await chrome.storage.local.remove(["isRecording", "startTime", "isPaused"]); } catch (_) {}
}

// ─── Offscreen ───────────────────────────────────────────────────────────────
async function ensureOffscreen() {
  try {
    const has = await chrome.offscreen.hasDocument();
    if (has) return;
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["USER_MEDIA"],
      justification: "Record tab audio/video while popup is closed."
    });
  } catch (_) {}
}

async function closeOffscreen() {
  try {
    const has = await chrome.offscreen.hasDocument();
    if (has) await chrome.offscreen.closeDocument();
  } catch (_) {}
}

// ─── Content Script ──────────────────────────────────────────────────────────
async function injectContentIfNeeded(tabId) {
  // Ping first — if content.js already loaded it will respond
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (res && res.ok) {
      // Already there — just start tracking
      await safeTabSend(tabId, { type: "START_TRACKING" });
      return;
    }
  } catch (_) {
    // Not injected yet — fall through to inject
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    // Small delay for script to initialize
    setTimeout(async () => {
      await safeTabSend(tabId, { type: "START_TRACKING" });
    }, 150);
  } catch (_) {}
}

// ─── Keepalive ───────────────────────────────────────────────────────────────
function startKeepAlive() {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(() => {
    try { void chrome.runtime.getPlatformInfo(); } catch (_) {}
  }, KEEP_ALIVE_MS);
}

function stopKeepAlive() {
  if (!keepAliveTimer) return;
  clearInterval(keepAliveTimer);
  keepAliveTimer = null;
}

function resetState() {
  recording   = false;
  isPaused    = false;
  activeTabId = null;
  stopKeepAlive();
}

// ─── Message Handler ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  // ── START ────────────────────────────────────────────────────────────────
  if (message.type === "START_RECORDING") {
    clickEvents  = [];
    recording    = true;
    activeTabId  = message.tabId || null;
    startKeepAlive();

    ensureOffscreen().then(async () => {
      // Forward streamId to offscreen for getUserMedia
      await safeRuntimeSend({ type: "OFFSCREEN_START", streamId: message.streamId });

      // Inject click tracker into recorded tab
      if (activeTabId !== null) {
        await injectContentIfNeeded(activeTabId);
      }

      await safeStorageSet({ isRecording: true, startTime: Date.now(), isPaused: false });
      sendResponse({ ok: true });
    });

    return true; // keep message channel open for async sendResponse
  }

  // ── PAUSE ────────────────────────────────────────────────────────────────
  if (message.type === "PAUSE_RECORDING") {
    isPaused = true;
    safeRuntimeSend({ type: "OFFSCREEN_PAUSE" });
    if (activeTabId !== null) safeTabSend(activeTabId, { type: "PAUSE_TRACKING" });
    safeStorageSet({ isPaused: true });
    sendResponse({ ok: true });
    return;
  }

  // ── RESUME ───────────────────────────────────────────────────────────────
  if (message.type === "RESUME_RECORDING") {
    isPaused = false;
    safeRuntimeSend({ type: "OFFSCREEN_RESUME" });
    if (activeTabId !== null) safeTabSend(activeTabId, { type: "RESUME_TRACKING" });
    safeStorageSet({ isPaused: false });
    sendResponse({ ok: true });
    return;
  }

  // ── STOP ─────────────────────────────────────────────────────────────────
  if (message.type === "STOP_RECORDING") {
    safeRuntimeSend({ type: "OFFSCREEN_STOP" });
    if (activeTabId !== null) safeTabSend(activeTabId, { type: "STOP_TRACKING" });
    resetState();
    safeStorageClear();
    sendResponse({ ok: true });
    return;
  }

  // ── OFFSCREEN STARTED → relay real startEpoch to popup ──────────────────
  if (message.type === "OFFSCREEN_STARTED") {
    safeRuntimeSend({ type: "OFFSCREEN_STARTED", startEpoch: message.startEpoch });
    sendResponse({ ok: true });
    return;
  }

  // ── RECORDING COMPLETE (from offscreen) ──────────────────────────────────
  if (message.type === "RECORDING_COMPLETE") {
    // Only accept from our offscreen document
    if (!sender || !sender.url || !sender.url.includes("offscreen.html")) return;

    recording = false;
    stopKeepAlive();

    const payload = {
      type:        "RECORDING_COMPLETE",
      videoBase64: message.videoBase64,
      mimeType:    message.mimeType,
      clickEvents: [...clickEvents]
    };

    // Try sending directly to popup (works if popup is open)
    safeRuntimeSend(payload);

    // Also persist so popup can download if it was closed during recording
    chrome.storage.local.set({ pendingDownload: payload }).catch(() => {});

    clickEvents = [];
    safeStorageClear();
    closeOffscreen();
    sendResponse({ ok: true });
    return;
  }

  // ── CLICK EVENT (from content.js) ────────────────────────────────────────
  if (message.type === "CLICK_EVENT") {
    if (recording && !isPaused && message.payload) {
      clickEvents.push(message.payload);
      // Show live click count in popup
      safeRuntimeSend({ type: "CLICK_COUNT", count: clickEvents.length });
    }
    return;
  }

  // ── PING (used by injectContentIfNeeded) ─────────────────────────────────
  if (message.type === "CONTENT_READY") {
    sendResponse({ ok: true });
    return;
  }
});

// ─── On Install ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  resetState();
  clickEvents = [];
  chrome.storage.local.clear().catch(() => {});
});
