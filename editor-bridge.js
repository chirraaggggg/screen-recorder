chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ZOOMCLIP_CLICKS') {
    window.postMessage({
      type: 'ZOOMCLIP_CLICKS',
      clickEvents: message.clickEvents,
      startEpoch: message.startEpoch
    }, '*');
  }
});
