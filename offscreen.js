let mediaRecorder = null;
let mediaStream   = null;
let chunks        = [];
let mimeType      = "video/webm;codecs=vp9";

// ─── Safe Send ───────────────────────────────────────────────────────────────
async function safeRuntimeSend(message) {
  try { await chrome.runtime.sendMessage(message); } catch (_) {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStartEpoch() {
  // Absolute wall-clock ms — syncs with popup's Date.now() timer
  return performance.timeOrigin + performance.now();
}

function getSupportedMimeType() {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

function cleanup() {
  if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
  mediaStream   = null;
  mediaRecorder = null;
  chunks        = [];
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror  = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ─── Recording ───────────────────────────────────────────────────────────────
async function startRecording(streamId) {
  if (!streamId) {
    await safeRuntimeSend({ type: "RECORDING_COMPLETE", videoBase64: null, mimeType });
    return;
  }

  try {
    // getUserMedia with chromeMediaSource:'tab' + streamId is the correct
    // way to capture in an offscreen document. getDisplayMedia is NOT used.
    const constraints = {
      video: {
        mandatory: {
          chromeMediaSource:   "tab",
          chromeMediaSourceId: streamId,
          maxWidth:            1920,
          maxHeight:           1080,
          maxFrameRate:        60
        }
      },
      audio: {
        mandatory: {
          chromeMediaSource:   "tab",
          chromeMediaSourceId: streamId
        }
      }
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    chunks      = [];
    mimeType    = getSupportedMimeType();

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType,
      videoBitsPerSecond: 8_000_000  // 8 Mbps — good quality for SaaS demos
    });

    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    });

    mediaRecorder.addEventListener("stop", async () => {
      try {
        const blob         = new Blob(chunks, { type: mimeType });
        const videoBase64  = await blobToBase64(blob);
        await safeRuntimeSend({ type: "RECORDING_COMPLETE", videoBase64, mimeType });
      } catch (_) {
        await safeRuntimeSend({ type: "RECORDING_COMPLETE", videoBase64: null, mimeType });
      } finally {
        cleanup();
      }
    });

    // Capture epoch right before start for accurate timer sync
    const startEpoch = getStartEpoch();
    mediaRecorder.start(1000); // chunk every 1 second

    // Notify background → popup with the real start time
    await safeRuntimeSend({ type: "OFFSCREEN_STARTED", startEpoch });

  } catch (err) {
    cleanup();
    await safeRuntimeSend({ type: "RECORDING_COMPLETE", videoBase64: null, mimeType });
  }
}

function pauseRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.pause();
  } catch (_) {}
}

function resumeRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state === "paused") mediaRecorder.resume();
  } catch (_) {}
}

function stopRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      // Never started — send empty signal so popup doesn't hang
      safeRuntimeSend({ type: "RECORDING_COMPLETE", videoBase64: null, mimeType });
      cleanup();
    }
  } catch (_) {
    safeRuntimeSend({ type: "RECORDING_COMPLETE", videoBase64: null, mimeType });
    cleanup();
  }
}

// ─── Message Listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return;
  if (message.type === "OFFSCREEN_START")  { startRecording(message.streamId); return; }
  if (message.type === "OFFSCREEN_PAUSE")  { pauseRecording();  return; }
  if (message.type === "OFFSCREEN_RESUME") { resumeRecording(); return; }
  if (message.type === "OFFSCREEN_STOP")   { stopRecording();   return; }
});
