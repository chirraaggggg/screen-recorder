// ─── Elements ────────────────────────────────────────────────────────────────
const idleState = document.getElementById('idleState');
const recordingState = document.getElementById('recordingState');
const startRecordBtn = document.getElementById('startRecordBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const recordingTimer = document.getElementById('recordingTimer');
const recordingStatus = document.getElementById('recordingStatus');
const clickCounter = document.getElementById('clickCounter');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const zoomSpeed = document.getElementById('zoomSpeed');
const autoZoomToggle = document.getElementById('autoZoomToggle');
const micToggle = document.getElementById('micToggle');
const audioToggle = document.getElementById('audioToggle');
const optionBtns = document.querySelectorAll('.option-btn');

// ─── State ───────────────────────────────────────────────────────────────────
let isRecording = false;
let isPaused = false;
let timerId = null;
let startEpoch = null;
let pendingSettings = {};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function safeRuntimeSend(message) {
  try { return await chrome.runtime.sendMessage(message); }
  catch (_) { return null; }
}

async function safeStorageGet(keys) {
  try { return await chrome.storage.local.get(keys); }
  catch (_) { return {}; }
}

async function safeStorageSet(values) {
  try { await chrome.storage.local.set(values); }
  catch (_) {}
}

async function safeStorageRemove(keys) {
  try { await chrome.storage.local.remove(keys); }
  catch (_) {}
}

function formatHMS(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getCurrentSettings() {
  return {
    autoZoom: autoZoomToggle.classList.contains('active'),
    zoomLevel: parseInt(zoomSlider.value) / 10,
    zoomSpeed: zoomSpeed.value,
    mic: micToggle.classList.contains('active'),
    systemAudio: audioToggle.classList.contains('active'),
    recordingArea: document.querySelector('.option-btn.active')?.dataset.area || 'tab'
  };
}

// ─── Timer ───────────────────────────────────────────────────────────────────
function startTimer(epoch) {
  stopTimer();
  startEpoch = epoch || Date.now();
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startEpoch) / 1000);
  recordingTimer.textContent = formatHMS(elapsed);
}

function pauseTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function resumeTimer() {
  if (!timerId) {
    timerId = setInterval(updateTimer, 1000);
  }
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  startEpoch = null;
  recordingTimer.textContent = '00:00:00';
}

// ─── UI States ───────────────────────────────────────────────────────────────
function showIdleState() {
  idleState.style.display = 'block';
  recordingState.style.display = 'none';
  isRecording = false;
  isPaused = false;
}

function showRecordingState() {
  idleState.style.display = 'none';
  recordingState.style.display = 'block';
  recordingState.style.display = 'block';
  isRecording = true;
}

function updateClickCount(count) {
  clickCounter.textContent = `${count} clicks captured`;
}

function updateRecordingStatus(domain) {
  recordingStatus.textContent = domain ? `Recording ${domain}...` : 'Recording...';
}

// ─── Settings Handlers ───────────────────────────────────────────────────────
function setupToggle(toggle, storageKey) {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    safeStorageSet({ [storageKey]: toggle.classList.contains('active') });
  });
}

setupToggle(autoZoomToggle, 'autoZoom');
setupToggle(micToggle, 'micEnabled');
setupToggle(audioToggle, 'systemAudioEnabled');

zoomSlider.addEventListener('input', () => {
  const val = parseInt(zoomSlider.value) / 10;
  zoomValue.textContent = `${val.toFixed(1)}x`;
  safeStorageSet({ zoomLevel: zoomSlider.value });
});

zoomSpeed.addEventListener('change', () => {
  safeStorageSet({ zoomSpeed: zoomSpeed.value });
});

optionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    optionBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    safeStorageSet({ recordingArea: btn.dataset.area });
  });
});

// ─── Record Button ───────────────────────────────────────────────────────────
startRecordBtn.addEventListener('click', async () => {
  startRecordBtn.disabled = true;
  startRecordBtn.textContent = 'Starting...';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];

    if (!tab?.id) {
      startRecordBtn.disabled = false;
      startRecordBtn.innerHTML = '<span class="record-dot"></span>Start Recording';
      return;
    }

    if (!tab.url?.startsWith('http')) {
      startRecordBtn.disabled = false;
      startRecordBtn.innerHTML = '<span class="record-dot"></span>Start Recording';
      return;
    }

    chrome.tabCapture.getMediaStreamId({ consumerTabId: tab.id }, async (streamId) => {
      const lastError = chrome.runtime.lastError;
      if (lastError || !streamId) {
        startRecordBtn.disabled = false;
        startRecordBtn.innerHTML = '<span class="record-dot"></span>Start Recording';
        return;
      }

      const domain = new URL(tab.url).hostname;
      pendingSettings = getCurrentSettings();

      await safeRuntimeSend({
        type: 'START_RECORDING',
        streamId,
        tabId: tab.id,
        domain,
        settings: pendingSettings
      });

      showRecordingState();
      updateRecordingStatus(domain);
      startRecordBtn.disabled = false;
      startRecordBtn.innerHTML = '<span class="record-dot"></span>Start Recording';
    });
  });
});

// ─── Pause / Resume ──────────────────────────────────────────────────────────
pauseBtn.addEventListener('click', async () => {
  if (isPaused) {
    isPaused = false;
    pauseBtn.textContent = 'Pause';
    resumeTimer();
    await safeRuntimeSend({ type: 'RESUME_RECORDING' });
  } else {
    isPaused = true;
    pauseBtn.textContent = 'Resume';
    pauseTimer();
    await safeRuntimeSend({ type: 'PAUSE_RECORDING' });
  }
});

// ─── Stop ────────────────────────────────────────────────────────────────────
stopBtn.addEventListener('click', async () => {
  stopBtn.disabled = true;
  pauseBtn.disabled = true;
  recordingStatus.textContent = 'Finalizing...';

  await safeRuntimeSend({ type: 'STOP_RECORDING' });

  // Wait up to 10s then reset
  setTimeout(() => {
    showIdleState();
    stopBtn.disabled = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    stopTimer();
  }, 10000);
});

// ─── Message Listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (!message?.type) return;

  if (message.type === 'OFFSCREEN_STARTED') {
    startEpoch = message.startEpoch;
    startTimer(startEpoch);
    return;
  }

  if (message.type === 'RECORDING_COMPLETE') {
    safeStorageRemove(['pendingRecording']);
    showIdleState();
    stopTimer();
    stopBtn.disabled = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    return;
  }

  if (message.type === 'CLICK_COUNT') {
    updateClickCount(message.count);
    return;
  }
});

// ─── Restore State on Load ───────────────────────────────────────────────────
(async () => {
  const state = await safeStorageGet([
    'isRecording', 'startTime', 'isPaused', 'pendingRecording',
    'autoZoom', 'zoomLevel', 'zoomSpeed', 'micEnabled', 'systemAudioEnabled', 'recordingArea', 'clickCount'
  ]);

  // Clear any pending recording (editor handles it)
  if (state.pendingRecording) {
    await safeStorageRemove(['pendingRecording']);
  }

  // Restore settings
  if (state.autoZoom !== undefined) {
    autoZoomToggle.classList.toggle('active', state.autoZoom);
  }
  if (state.micEnabled !== undefined) {
    micToggle.classList.toggle('active', state.micEnabled);
  }
  if (state.systemAudioEnabled !== undefined) {
    audioToggle.classList.toggle('active', state.systemAudioEnabled);
  }
  if (state.zoomLevel !== undefined) {
    zoomSlider.value = state.zoomLevel;
    zoomValue.textContent = `${(parseInt(state.zoomLevel) / 10).toFixed(1)}x`;
  }
  if (state.zoomSpeed !== undefined) {
    zoomSpeed.value = state.zoomSpeed;
  }
  if (state.recordingArea !== undefined) {
    optionBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.area === state.recordingArea);
    });
  }

  // Check recording state
  if (state.isRecording) {
    showRecordingState();
    updateRecordingStatus(state.activeTabDomain);
    updateClickCount(state.clickCount || 0);
    if (state.startTime) {
      startEpoch = state.startTime;
      startTimer(startEpoch);
    }
    if (state.isPaused) {
      isPaused = true;
      pauseBtn.textContent = 'Resume';
      pauseTimer();
    }
  } else {
    showIdleState();
  }
})();
