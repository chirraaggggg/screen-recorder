let mediaRecorder = null;
let mediaStream = null;
let dbPromise = null;
let chunkCount = 0;

function getEpochNow() {
  return performance.timeOrigin + performance.now();
}

function openDb() {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("screen-recorder", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("chunks")) {
        db.createObjectStore("chunks", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function clearChunks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chunks", "readwrite");
    tx.objectStore("chunks").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function storeChunk(blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chunks", "readwrite");
    tx.objectStore("chunks").add({ data: blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadAllChunks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chunks", "readonly");
    const request = tx.objectStore("chunks").getAll();
    request.onsuccess = () => {
      const result = request.result.map((entry) => entry.data);
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

async function startRecording() {
  await clearChunks();
  chunkCount = 0;

  mediaStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: false
  });

  mediaRecorder = new MediaRecorder(mediaStream, {
    mimeType: "video/webm;codecs=vp9"
  });

  const startEpoch = getEpochNow();
  mediaRecorder.addEventListener("dataavailable", async (event) => {
    if (event.data && event.data.size > 0) {
      chunkCount += 1;
      await storeChunk(event.data);
    }
  });

  mediaRecorder.addEventListener("stop", async () => {
    const chunks = await loadAllChunks();
    const videoBlob = new Blob(chunks, { type: "video/webm" });
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    mediaStream = null;
    mediaRecorder = null;
    chrome.runtime.sendMessage({
      type: "offscreen-stopped",
      videoBlob
    });
  });

  mediaRecorder.start(1000);
  chrome.runtime.sendMessage({
    type: "offscreen-started",
    startEpoch
  });
}

function pauseRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
  }
}

function resumeRecording() {
  if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "offscreen-start") {
    startRecording();
    return;
  }

  if (message.type === "offscreen-pause") {
    pauseRecording();
    return;
  }

  if (message.type === "offscreen-resume") {
    resumeRecording();
    return;
  }

  if (message.type === "offscreen-stop") {
    stopRecording();
    return;
  }
});
