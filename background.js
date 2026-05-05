const OFFSCREEN_URL  = "offscreen.html";
const KEEP_ALIVE_MS  = 20000;

let recording      = false;
let isPaused       = false;
let activeTabId    = null;
let clickEvents    = [];
let clickCount     = 0;
let pendingEditorTabId = null;
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
  clickCount  = 0;
  stopKeepAlive();
}

// ─── Editor Relay Injection ────────────────────────────────────────────────
async function injectEditorRelay(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        let sent = false;

        const send = async () => {
          if (sent) return;
          try {
            const { pendingClickEvents } = await chrome.storage.session.get(["pendingClickEvents"]);
            if (Array.isArray(pendingClickEvents) && pendingClickEvents.length > 0) {
              window.postMessage({ type: "ZOOM_CLIP_EVENTS", clickEvents: pendingClickEvents }, "*");
              sent = true;
            }
          } catch (_) {}
        };

        window.addEventListener("message", (e) => {
          if (e?.data?.type === "ZOOM_CLIP_REQUEST_EVENTS") {
            void send();
          }
        });

        // Try a couple times in case the app hasn't mounted its listener yet.
        setTimeout(() => void send(), 150);
        setTimeout(() => void send(), 900);
      },
    });
  } catch (_) {}
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!pendingEditorTabId) return;
  if (tabId !== pendingEditorTabId) return;
  if (changeInfo.status !== "complete") return;

  // Inject relay once the editor tab has finished loading.
  injectEditorRelay(tabId);
  pendingEditorTabId = null;
});

// ─── Message Handler ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  // ── START ────────────────────────────────────────────────────────────────
  if (message.type === "START_RECORDING") {
    clickEvents  = [];
    clickCount   = 0;
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

    const savedClickEvents = [...clickEvents];

    const payload = {
      type:        "RECORDING_COMPLETE",
      videoBase64: message.videoBase64,
      mimeType:    message.mimeType,
      clickEvents: savedClickEvents
    };

    // Try sending directly to popup (works if popup is open)
    safeRuntimeSend(payload);

    // Persist so popup can download if it was closed during recording
    chrome.storage.local.set({ pendingDownload: payload }).catch(() => {});

    // ── NEW: Store click events in session storage + open editor ──────────────
    // Keep timestamps in ms (web editor uses ms)
    const editorEvents = savedClickEvents.map(ev => ({
      id:          ev.id,
      timestamp:   ev.timestamp, // ms
      x:           ev.x,
      y:           ev.y,
      confidence:  1,
      source:      'EXTENSION',
      target:      ev.target || 'EXTENSION'
    }));

    chrome.storage.session.set({
      pendingClickEvents: editorEvents,
      pendingTimestamp:   Date.now()
    }).then(() => {
      chrome.tabs.create(
        { url: 'http://localhost:3000/editor?source=extension' },
        (tab) => {
          if (tab && typeof tab.id === 'number') {
            pendingEditorTabId = tab.id;
          }
        }
      );
    }).catch(() => {});
    // ─────────────────────────────────────────────────────────────────────────

    clickEvents = [];
    safeStorageClear();
    closeOffscreen();
    sendResponse({ ok: true });
    return;
  }

  // ── CLICK EVENT (from content.js) ────────────────────────────────────────
  if (message.type === "CLICK_EVENT") {
    if (recording && !isPaused && message.payload) {
      clickCount += 1;
      // Show live click count in popup
      safeRuntimeSend({ type: "CLICK_COUNT", count: clickCount });
    }
    sendResponse({ ok: true });
    return;
  }

  // ── Full click list ready (from content.js on STOP_TRACKING) ─────────────
  if (message.type === "CLICK_EVENTS_READY") {
    if (Array.isArray(message.payload)) {
      clickEvents = message.payload;
      clickCount = clickEvents.length;
      safeRuntimeSend({ type: "CLICK_COUNT", count: clickCount });
    }
    sendResponse({ ok: true });
    return;
  }

  // ── Editor can request stored events (only works from an injected script) ─
  if (message.type === "GET_PENDING_CLICK_EVENTS") {
    chrome.storage.session
      .get(["pendingClickEvents"])
      .then((res) => sendResponse({ events: res.pendingClickEvents || [] }))
      .catch(() => sendResponse({ events: [] }));
    return true;
  }

  // ── GET PENDING EVENTS (from editor page via chrome.runtime.sendMessage) ──
  if (message.type === "GET_PENDING_CLICK_EVENTS") {
    chrome.storage.session.get(['pendingClickEvents', 'pendingTimestamp'])
      .then(result => {
        const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
        const isStale = !result.pendingTimestamp ||
          (Date.now() - result.pendingTimestamp) > MAX_AGE_MS;

        if (isStale) {
          // Clear stale data
          chrome.storage.session.remove(['pendingClickEvents', 'pendingTimestamp']).catch(() => {});
          sendResponse({ events: [] });
        } else {
          sendResponse({ events: result.pendingClickEvents || [] });
          // Clear after delivering
          chrome.storage.session.remove(['pendingClickEvents', 'pendingTimestamp']).catch(() => {});
        }
      })
      .catch(() => sendResponse({ events: [] }));
    return true; // keep channel open for async sendResponse
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
