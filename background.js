const OFFSCREEN_URL = "offscreen.html";

let recording = false;
let recordingStartEpoch = null;
let clickEvents = [];
let activeTabId = null;
let pendingStart = false;

async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument();
  if (has) {
    return;
  }
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["USER_MEDIA"],
    justification: "Record screen and stream to MediaRecorder."
  });
}

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) {
    return null;
  }
  return tabs[0].id;
}

async function startRecording() {
  if (recording || pendingStart) {
    return;
  }
  pendingStart = true;
  clickEvents = [];
  recordingStartEpoch = null;

  await ensureOffscreen();
  activeTabId = await getActiveTabId();

  if (activeTabId !== null) {
    chrome.tabs.sendMessage(activeTabId, { type: "recording-starting" });
  }

  chrome.runtime.sendMessage({ type: "offscreen-start" });
}

function pauseRecording() {
  if (!recording) {
    return;
  }
  chrome.runtime.sendMessage({ type: "offscreen-pause" });
  if (activeTabId !== null) {
    chrome.tabs.sendMessage(activeTabId, { type: "recording-paused" });
  }
}

function resumeRecording() {
  if (!recording) {
    return;
  }
  chrome.runtime.sendMessage({ type: "offscreen-resume" });
  if (activeTabId !== null) {
    chrome.tabs.sendMessage(activeTabId, { type: "recording-resumed" });
  }
}

function stopRecording() {
  if (!recording && !pendingStart) {
    return;
  }
  chrome.runtime.sendMessage({ type: "offscreen-stop" });
  if (activeTabId !== null) {
    chrome.tabs.sendMessage(activeTabId, { type: "recording-stopped" });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "ui-start") {
    startRecording();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "ui-pause") {
    if (recording && !message.paused) {
      pauseRecording();
    } else if (recording && message.paused) {
      resumeRecording();
    }
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "ui-stop") {
    stopRecording();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "click-event") {
    if (recording && typeof message.timestamp === "number") {
      clickEvents.push({ timestamp: message.timestamp, x: message.x, y: message.y });
    }
    return;
  }

  if (message.type === "offscreen-started") {
    recording = true;
    pendingStart = false;
    recordingStartEpoch = message.startEpoch;
    if (activeTabId !== null) {
      chrome.tabs.sendMessage(activeTabId, {
        type: "recording-started",
        startEpoch: recordingStartEpoch
      });
    }
    chrome.runtime.sendMessage({ type: "recording-status", status: "recording" });
    return;
  }

  if (message.type === "offscreen-stopped") {
    recording = false;
    pendingStart = false;
    const payload = {
      type: "recording-complete",
      videoBlob: message.videoBlob,
      clickEvents
    };
    chrome.runtime.sendMessage(payload);
    if (activeTabId !== null) {
      chrome.tabs.sendMessage(activeTabId, { type: "recording-complete" });
    }
    clickEvents = [];
    recordingStartEpoch = null;
    return;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  recording = false;
  pendingStart = false;
  clickEvents = [];
  recordingStartEpoch = null;
});
