// ─── Elements ────────────────────────────────────────────────────────────────
const statusEl    = document.getElementById("status");
const errorEl     = document.getElementById("error");
const recordBtn   = document.getElementById("recordBtn");
const pauseBtn    = document.getElementById("pauseBtn");
const stopBtn     = document.getElementById("stopBtn");
const timerEl     = document.getElementById("timer");
const clicksInfoEl = document.getElementById("clicksInfo");

// ─── State ───────────────────────────────────────────────────────────────────
let paused          = false;
let timerId         = null;
let timerSeconds    = 0;
let stopSafetyTimer = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function safeRuntimeSend(message) {
  try { return await chrome.runtime.sendMessage(message); }
  catch (_) { return null; }
}

async function safeStorageGet(keys) {
  try { return await chrome.storage.local.get(keys); }
  catch (_) { return {}; }
}

async function safeStorageRemove(keys) {
  try { await chrome.storage.local.remove(keys); }
  catch (_) {}
}

function setError(text) {
  errorEl.textContent = text || "";
}

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Timer ───────────────────────────────────────────────────────────────────
function startTimer(startEpochMs) {
  stopTimer(true);
  timerSeconds = Math.max(0, Math.floor((Date.now() - startEpochMs) / 1000));
  timerEl.textContent = formatTime(timerSeconds);
  timerEl.classList.add("active");
  timerId = setInterval(() => {
    timerSeconds++;
    timerEl.textContent = formatTime(timerSeconds);
  }, 1000);
}

function pauseTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}

function resumeTimer() {
  if (timerId) return;
  timerEl.classList.add("active");
  timerId = setInterval(() => {
    timerSeconds++;
    timerEl.textContent = formatTime(timerSeconds);
  }, 1000);
}

function stopTimer(keepDisplay) {
  if (timerId) { clearInterval(timerId); timerId = null; }
  if (!keepDisplay) {
    timerSeconds = 0;
    timerEl.textContent = "00:00";
    timerEl.classList.remove("active");
  }
}

// ─── UI States ───────────────────────────────────────────────────────────────
function setIdleUI() {
  recordBtn.hidden   = false;
  recordBtn.disabled = false;
  pauseBtn.hidden    = true;
  stopBtn.hidden     = true;
  stopBtn.disabled   = false;
  pauseBtn.disabled  = false;
  paused = false;
  statusEl.textContent = "Ready to record";
  clicksInfoEl.classList.remove("visible");
  setError("");
  stopTimer(false);
  if (stopSafetyTimer) { clearTimeout(stopSafetyTimer); stopSafetyTimer = null; }
}

function setRecordingUI(startEpochMs) {
  recordBtn.hidden   = true;
  pauseBtn.hidden    = false;
  pauseBtn.disabled  = false;
  stopBtn.hidden     = false;
  stopBtn.disabled   = false;
  pauseBtn.textContent = "Pause";
  paused = false;
  statusEl.textContent = "Recording...";
  clicksInfoEl.classList.add("visible");
  if (startEpochMs) { startTimer(startEpochMs); }
  else              { resumeTimer(); }
}

function setPausedUI() {
  pauseBtn.textContent = "Resume";
  paused = true;
  statusEl.textContent = "Paused";
  pauseTimer();
}

function updateClickCount(count) {
  if (typeof count === "number") {
    clicksInfoEl.textContent = `${count} click${count === 1 ? "" : "s"} captured`;
  }
}

// ─── Download ────────────────────────────────────────────────────────────────
async function handleRecordingComplete(message) {
  try {
    const { videoBase64, mimeType } = message;
    if (!videoBase64) {
      setError("Recording failed to finalize.");
      setIdleUI();
      return;
    }
    const blob = await (await fetch(videoBase64)).blob();
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `zoomclip-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    await safeStorageRemove(["pendingDownload"]);
    setIdleUI();
  } catch (_) {
    setError("Download failed. Try again.");
    setIdleUI();
  }
}

// ─── Record Button ───────────────────────────────────────────────────────────
recordBtn.addEventListener("click", () => {
  setError("");
  statusEl.textContent = "Starting...";
  recordBtn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs.length ? tabs[0] : null;

    // Must have a valid tab
    if (!tab || typeof tab.id !== "number") {
      setIdleUI();
      setError("No active tab found.");
      return;
    }

    // tabCapture only works on http/https pages
    if (!tab.url || (!tab.url.startsWith("http://") && !tab.url.startsWith("https://"))) {
      setIdleUI();
      setError("Open an http/https website first, then click Record.");
      return;
    }

    // getMediaStreamId MUST be called directly here with no async gap before it
    chrome.tabCapture.getMediaStreamId({ consumerTabId: tab.id }, async (streamId) => {
      const lastError = chrome.runtime.lastError;
      if (lastError || !streamId) {
        setIdleUI();
        setError(lastError ? lastError.message : "Permission denied. Try again.");
        return;
      }

      try {
        const result = await safeRuntimeSend({
          type: "START_RECORDING",
          streamId,
          tabId: tab.id
        });
        if (!result) {
          setIdleUI();
          setError("Background not ready. Reload the extension.");
          return;
        }
        // UI stays on "Starting..." until OFFSCREEN_STARTED arrives
        statusEl.textContent = "Starting...";
      } catch (_) {
        setIdleUI();
        setError("Failed to start recording.");
      }
    });
  });
});

// ─── Pause / Resume ──────────────────────────────────────────────────────────
pauseBtn.addEventListener("click", async () => {
  try {
    if (paused) {
      setRecordingUI(null);
      await safeRuntimeSend({ type: "RESUME_RECORDING" });
    } else {
      setPausedUI();
      await safeRuntimeSend({ type: "PAUSE_RECORDING" });
    }
  } catch (_) {
    setError("Pause/resume failed.");
  }
});

// ─── Stop ────────────────────────────────────────────────────────────────────
stopBtn.addEventListener("click", async () => {
  try {
    stopBtn.disabled  = true;
    pauseBtn.disabled = true;
    statusEl.textContent = "Finalizing...";
    await safeRuntimeSend({ type: "STOP_RECORDING" });

    // Safety net — reset if RECORDING_COMPLETE never arrives
    stopSafetyTimer = setTimeout(() => {
      setError("Timed out. Try again.");
      setIdleUI();
    }, 10000);
  } catch (_) {
    setError("Stop failed.");
    setIdleUI();
  }
});

// ─── Message Listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return;

  if (message.type === "OFFSCREEN_STARTED") {
    // Real start epoch from offscreen — set timer accurately
    setRecordingUI(message.startEpoch);
    return;
  }

  if (message.type === "RECORDING_COMPLETE") {
    if (stopSafetyTimer) { clearTimeout(stopSafetyTimer); stopSafetyTimer = null; }
    handleRecordingComplete(message);
    return;
  }

  if (message.type === "CLICK_COUNT") {
    updateClickCount(message.count);
    return;
  }
});

// ─── Restore State on Open ───────────────────────────────────────────────────
(async () => {
  try {
    const state = await safeStorageGet([
      "isRecording", "startTime", "isPaused", "pendingDownload"
    ]);

    // If recording finished while popup was closed, download now
    if (state.pendingDownload) {
      await handleRecordingComplete(state.pendingDownload);
      return;
    }

    if (state.isRecording) {
      setRecordingUI(state.startTime || Date.now());
      if (state.isPaused) setPausedUI();
    } else {
      setIdleUI();
    }
  } catch (_) {
    setIdleUI();
  }
})();
