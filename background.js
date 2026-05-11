const OFFSCREEN_URL = 'offscreen.html';
const EDITOR_URL = 'http://localhost:3000/editor';
const KEEP_ALIVE_MS = 20000;

let recording = false;
let isPaused = false;
let activeTabId = null;
let clickEvents = [];
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
  try { await chrome.storage.local.clear(); } catch (_) {}
}

// ─── Keepalive ───────────────────────────────────────────────────────────────
function startKeepAlive() {
  if (keepAliveTimer) return;
  keepAliveTimer = setInterval(() => {
    try { chrome.runtime.getPlatformInfo(); } catch (_) {}
  }, KEEP_ALIVE_MS);
}

function stopKeepAlive() {
  if (!keepAliveTimer) return;
  clearInterval(keepAliveTimer);
  keepAliveTimer = null;
}

function resetState() {
  recording = false;
  isPaused = false;
  activeTabId = null;
  clickEvents = [];
  stopKeepAlive();
}

// ─── Offscreen ───────────────────────────────────────────────────────────────
async function ensureOffscreen() {
  try {
    const has = await chrome.offscreen.hasDocument();
    if (has) return;
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['USER_MEDIA'],
      justification: 'Screen recording'
    });
  } catch (_) {}
}

// ─── Content Script ──────────────────────────────────────────────────────────
async function injectContentIfNeeded(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    if (res && res.ok) {
      await safeTabSend(tabId, { type: 'START_TRACKING' });
      return;
    }
  } catch (_) {
    // Not injected yet — inject now
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    setTimeout(async () => {
      await safeTabSend(tabId, { type: 'START_TRACKING' });
    }, 150);
  } catch (_) {}
}

// ─── Floating Bar ────────────────────────────────────────────────────────────
async function injectFloatingBar(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['floating-bar.js']
    });
  } catch (_) {}
}

// ─── Editor Handling ─────────────────────────────────────────────────────────
async function waitForEditor(tabId, clickEvents, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 500))
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'EDITOR_PING' })
      if (response?.ready) {
        await chrome.tabs.sendMessage(tabId, {
          type: 'ZOOMCLIP_CLICKS',
          clickEvents
        })
        return
      }
    } catch(_) {}
  }
}

async function openOrFocusEditor(clickEvents, startEpoch) {
  const tabs = await chrome.tabs.query({});
  const editorTab = tabs.find(t => t.url && t.url.includes(EDITOR_URL));

  if (editorTab && editorTab.id) {
    await chrome.tabs.update(editorTab.id, { active: true });
    await waitForEditor(editorTab.id, clickEvents)
  } else {
    const newTab = await chrome.tabs.create({ url: EDITOR_URL });
    // Wait for tab to load then poll for readiness
    if (newTab.id) {
      await waitForEditor(newTab.id, clickEvents)
    }
  }
}

// ─── Message Handler ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  // ── START RECORDING ───────────────────────────────────────────────────────
  if (message.type === 'START_RECORDING') {
    clickEvents = [];
    recording = true;
    activeTabId = message.tabId || null;
    startKeepAlive();

    ensureOffscreen().then(async () => {
      await safeRuntimeSend({
        type: 'OFFSCREEN_START',
        streamId: message.streamId,
        settings: message.settings
      });
      await injectContentIfNeeded(message.tabId);
      await injectFloatingBar(message.tabId);
      await safeStorageSet({
        isRecording: true,
        startTime: Date.now(),
        isPaused: false,
        clickCount: 0,
        activeTabDomain: message.domain
      });
      sendResponse({ ok: true });
    });

    return true;
  }

  // ── PAUSE RECORDING ───────────────────────────────────────────────────────
  if (message.type === 'PAUSE_RECORDING') {
    isPaused = true;
    safeRuntimeSend({ type: 'OFFSCREEN_PAUSE' });
    safeTabSend(activeTabId, { type: 'PAUSE_TRACKING' });
    safeTabSend(activeTabId, { type: 'BAR_PAUSE' });
    safeStorageSet({ isPaused: true });
    sendResponse({ ok: true });
    return;
  }

  // ── RESUME RECORDING ──────────────────────────────────────────────────────
  if (message.type === 'RESUME_RECORDING') {
    isPaused = false;
    safeRuntimeSend({ type: 'OFFSCREEN_RESUME' });
    safeTabSend(activeTabId, { type: 'RESUME_TRACKING' });
    safeTabSend(activeTabId, { type: 'BAR_RESUME' });
    safeStorageSet({ isPaused: false });
    sendResponse({ ok: true });
    return;
  }

  // ── STOP RECORDING ────────────────────────────────────────────────────────
  if (message.type === 'STOP_RECORDING') {
    safeRuntimeSend({ type: 'OFFSCREEN_STOP' });
    safeTabSend(activeTabId, { type: 'STOP_TRACKING' });
    safeTabSend(activeTabId, { type: 'REMOVE_BAR' });
    resetState();
    safeStorageClear();
    sendResponse({ ok: true });
    return;
  }

  // ── RECORDING COMPLETE (from offscreen only) ──────────────────────────────
  if (message.type === 'RECORDING_COMPLETE') {
    // Only accept from offscreen document
    if (!sender || !sender.url || !sender.url.includes('offscreen.html')) return;

    stopKeepAlive();

    const payload = {
      videoBase64: message.videoBase64,
      mimeType: message.mimeType,
      clickEvents: [...clickEvents]
    };

    chrome.storage.local.set({ pendingRecording: payload }).catch(() => {});
    openOrFocusEditor([...clickEvents], message.startEpoch);

    clickEvents = [];
    recording = false;
    sendResponse({ ok: true });
    return;
  }

  // ── CLICK EVENT (from content.js) ────────────────────────────────────────
  if (message.type === 'CLICK_EVENT') {
    if (recording && !isPaused && message.payload) {
      clickEvents.push(message.payload);
      safeRuntimeSend({ type: 'CLICK_COUNT', count: clickEvents.length });
      safeStorageSet({ clickCount: clickEvents.length });
    }
    sendResponse({ ok: true });
    return;
  }

  // ── PING ──────────────────────────────────────────────────────────────────
  if (message.type === 'PING') {
    sendResponse({ ok: true });
    return;
  }
});
