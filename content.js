let isTracking = false;
let startTime = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'START_TRACKING') {
    if (isTracking) {
      sendResponse({ ok: true });
      return;
    }
    isTracking = true;
    startTime = performance.now();
    window.addEventListener('click', clickHandler, true);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'PAUSE_TRACKING') {
    isTracking = false;
    return;
  }

  if (message.type === 'RESUME_TRACKING') {
    isTracking = true;
    return;
  }

  if (message.type === 'STOP_TRACKING') {
    isTracking = false;
    startTime = null;
    window.removeEventListener('click', clickHandler, true);
    sendResponse({ ok: true });
    return;
  }
});

function clickHandler(e) {
  if (!isTracking || !startTime) return;
  try {
    chrome.runtime.sendMessage({
      type: 'CLICK_EVENT',
      payload: {
        timestamp: Math.round(performance.now() - startTime),
        x: e.clientX,
        y: e.clientY,
        target: e.target?.tagName ?? 'UNKNOWN',
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
      }
    });
  } catch (_) {}
}
