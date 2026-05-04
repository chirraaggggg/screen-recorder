let isRecording = false;
let recordingStartEpoch = null;
let toolbarFrame = null;
let toolbarVisible = false;

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
  chrome.runtime.sendMessage({
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
}

function stopTracking() {
  isRecording = false;
  recordingStartEpoch = null;
  window.removeEventListener("click", onClick, true);
  hideToolbar();
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
