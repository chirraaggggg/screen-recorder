// Respond to ping so background knows editor is ready
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EDITOR_PING') {
    sendResponse({ ready: true })
    return true
  }
  if (msg.type === 'ZOOMCLIP_CLICKS') {
    window.postMessage({
      type: 'ZOOMCLIP_CLICKS',
      clickEvents: msg.clickEvents,
      startEpoch: msg.startEpoch
    }, '*')
  }
})
