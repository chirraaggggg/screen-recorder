let isRecording = false;
let recordingStartEpoch = null;
let toolbarFrame = null;
let toolbarVisible = false;
let retryTimer = null;
let keepAliveTimer = null;
const sendQueue = [];
const RETRY_INTERVAL_MS = 1000;
const KEEP_ALIVE_MS = 15000;

async function safeRuntimeSend(message, queueOnFail = true) {
  try {
    await chrome.runtime.sendMessage(message);
    await flushSendQueue();
    return true;
  } catch (error) {
    if (queueOnFail) {
      sendQueue.push(message);
    }
    return false;
  }
}

async function flushSendQueue() {
  if (!sendQueue.length) {
    return;
  }
  const pending = sendQueue.splice(0);
  for (let i = 0; i < pending.length; i += 1) {
    const message = pending[i];
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      sendQueue.unshift(message, ...pending.slice(i + 1));
      break;
    }
  }
}

function getEpochNow() {
  return performance.timeOrigin + performance.now();
}

function ensureToolbar() {
  if (toolbarFrame) {
    return;
  }
  const frame = document.createElement("iframe");
  frame.src = chrome.runtime.getURL("toolbar.html");
  frame.style.position = "fixed";
  frame.style.top = "16px";
  frame.style.right = "16px";
  frame.style.width = "260px";
  frame.style.height = "56px";
  frame.style.border = "none";
  frame.style.zIndex = "2147483647";
  frame.style.background = "transparent";
  frame.setAttribute("allow", "display-capture");
  toolbarFrame = frame;
}

function showToolbar() {
  if (!toolbarFrame) {
    ensureToolbar();
  }
  if (!toolbarVisible && toolbarFrame) {
    document.documentElement.appendChild(toolbarFrame);
    toolbarVisible = true;
  }
}

function hideToolbar() {
  if (toolbarFrame && toolbarVisible) {
    toolbarFrame.remove();
    toolbarVisible = false;
  }
}

function onClick(event) {
  if (!isRecording || recordingStartEpoch === null) {
    return;
  }
  const timestamp = getEpochNow() - recordingStartEpoch;
  safeRuntimeSend({
    type: "click-event",
    timestamp,
    x: event.clientX,
    y: event.clientY
  });
}

function startTracking(startEpoch) {
  isRecording = true;
  recordingStartEpoch = startEpoch;
  showToolbar();
  window.addEventListener("click", onClick, true);
  if (!retryTimer) {
    retryTimer = setInterval(() => {
      flushSendQueue();
    }, RETRY_INTERVAL_MS);
  }
  if (!keepAliveTimer) {
    keepAliveTimer = setInterval(() => {
      safeRuntimeSend({ type: "keep-alive" }, false);
    }, KEEP_ALIVE_MS);
  }
}

function stopTracking() {
  isRecording = false;
  recordingStartEpoch = null;
  window.removeEventListener("click", onClick, true);
  hideToolbar();
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "recording-starting") {
    showToolbar();
    return;
  }

  if (message.type === "recording-started") {
    startTracking(message.startEpoch);
    return;
  }

  if (message.type === "recording-stopped") {
    stopTracking();
    return;
  }

  if (message.type === "recording-paused") {
    isRecording = false;
    return;
  }

  if (message.type === "recording-resumed") {
    isRecording = true;
    return;
  }
});