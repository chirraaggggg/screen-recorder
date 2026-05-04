const recordBtn = document.getElementById("recordBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");

let paused = false;

recordBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ui-start" });
  paused = false;
  pauseBtn.textContent = "Pause";
});

pauseBtn.addEventListener("click", () => {
  if (paused) {
    chrome.runtime.sendMessage({ type: "ui-pause", paused: true });
    pauseBtn.textContent = "Pause";
    paused = false;
  } else {
    chrome.runtime.sendMessage({ type: "ui-pause", paused: false });
    pauseBtn.textContent = "Resume";
    paused = true;
  }
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "ui-stop" });
  paused = false;
  pauseBtn.textContent = "Pause";
});
