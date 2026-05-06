let mediaStream = null;
let mediaRecorder = null;
let chunks = [];
let startEpoch = null;

// ─── Safe Send ───────────────────────────────────────────────────────────────
async function safeRuntimeSend(message) {
  try { await chrome.runtime.sendMessage(message); } catch (_) {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function cleanup() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
  mediaStream = null;
  mediaRecorder = null;
  chunks = [];
}

// ─── Recording ───────────────────────────────────────────────────────────────
async function startRecording(streamId) {
  if (!streamId) {
    cleanup();
    return;
  }

  try {
    const constraints = {
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 60
        }
      },
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    chunks = [];

    // Find supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    let mimeType = 'video/webm';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType,
      videoBitsPerSecond: 8_000_000
    });

    mediaRecorder.addEventListener('dataavailable', (e) => {
      if (e.data?.size > 0) chunks.push(e.data);
    });

    mediaRecorder.addEventListener('stop', async () => {
      const blob = new Blob(chunks, { type: mimeType });
      const base64 = await blobToBase64(blob);
      try {
        chrome.runtime.sendMessage({
          type: 'RECORDING_COMPLETE',
          videoBase64: base64,
          mimeType,
          startEpoch
        });
      } catch (_) {}
      cleanup();
    });

    startEpoch = performance.timeOrigin + performance.now();
    mediaRecorder.start(1000);

    try {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_STARTED', startEpoch });
    } catch (_) {}

  } catch (err) {
    cleanup();
  }
}

function pauseRecording() {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.pause();
  }
}

function resumeRecording() {
  if (mediaRecorder?.state === 'paused') {
    mediaRecorder.resume();
  }
}

function stopRecording() {
  if (mediaRecorder?.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// ─── Message Listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (!message?.type) return;

  switch (message.type) {
    case 'OFFSCREEN_START':
      startRecording(message.streamId);
      break;
    case 'OFFSCREEN_PAUSE':
      pauseRecording();
      break;
    case 'OFFSCREEN_RESUME':
      resumeRecording();
      break;
    case 'OFFSCREEN_STOP':
      stopRecording();
      break;
  }
});
