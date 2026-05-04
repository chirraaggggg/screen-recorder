const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");

let paused = false;

function setStatus(text) {
  statusEl.textContent = text;
}

startBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ui-start" });
  setStatus("Starting...");
  paused = false;
  pauseBtn.textContent = "Pause";
});

pauseBtn.addEventListener("click", () => {
  if (paused) {
    chrome.runtime.sendMessage({ type: "ui-pause", paused: true });
    pauseBtn.textContent = "Pause";
    setStatus("Recording");
    paused = false;
  } else {
    chrome.runtime.sendMessage({ type: "ui-pause", paused: false });
    pauseBtn.textContent = "Resume";
    setStatus("Paused");
    paused = true;
  }
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ui-stop" });
  setStatus("Stopping...");
  paused = false;
  pauseBtn.textContent = "Pause";
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) {
    return;
  }
  if (message.type === "recording-status") {
    setStatus(message.status === "recording" ? "Recording" : "Idle");
  }
  if (message.type === "recording-complete") {
    setStatus("Saved");
  }
});
