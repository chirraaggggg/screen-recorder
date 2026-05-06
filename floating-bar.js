// floating-bar.js — Injected floating recording toolbar

// Guard against double injection
if (!document.getElementById('zoomclip-bar')) {

  // Create style element
  const style = document.createElement('style');
  style.textContent = `
    #zoomclip-bar {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .zb-wrap {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      background: rgba(18, 18, 18, 0.9);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      padding: 8px 16px;
      color: #f0f0f0;
      font-size: 13px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      cursor: move;
      user-select: none;
    }
    .zb-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ff4444;
      animation: zb-pulse 1.4s infinite;
    }
    @keyframes zb-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .zb-timer {
      min-width: 60px;
      font-variant-numeric: tabular-nums;
    }
    .zb-sep {
      width: 1px;
      height: 16px;
      background: rgba(255, 255, 255, 0.12);
    }
    .zb-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      border-radius: 999px;
      color: #f0f0f0;
      padding: 4px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .zb-btn:hover {
      background: rgba(255, 255, 255, 0.16);
    }
    .zb-stop {
      background: rgba(255, 68, 68, 0.15);
      color: #ff7777;
    }
    .zb-stop:hover {
      background: rgba(255, 68, 68, 0.25);
    }
  `;
  document.head.appendChild(style);

  // Create bar element
  const bar = document.createElement('div');
  bar.id = 'zoomclip-bar';
  bar.innerHTML = `
    <div class="zb-wrap" id="zb-wrap">
      <div class="zb-dot"></div>
      <div class="zb-timer" id="zb-timer">00:00:00</div>
      <div class="zb-sep"></div>
      <button class="zb-btn" id="zb-pause">Pause</button>
      <button class="zb-btn zb-stop" id="zb-stop">Stop</button>
    </div>
  `;
  document.body.appendChild(bar);

  // Timer state
  let startTime = Date.now();
  let pausedTime = 0;
  let isPaused = false;
  let timerInterval = null;

  // Format time as HH:MM:SS
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Update timer
  function updateTimer() {
    if (!isPaused) {
      const elapsed = Date.now() - startTime - pausedTime;
      document.getElementById('zb-timer').textContent = formatTime(elapsed);
    }
  }

  // Start timer
  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(updateTimer, 1000);
  }

  // Pause timer
  function pauseTimer() {
    if (isPaused) return;
    isPaused = true;
    pausedTime += Date.now() - (startTime + pausedTime);
  }

  // Resume timer
  function resumeTimer() {
    if (!isPaused) return;
    isPaused = false;
    const now = Date.now();
    startTime = now - (pausedTime);
    pausedTime = 0;
  }

  // Draggable functionality
  const wrap = document.getElementById('zb-wrap');
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let barStartX = 0;
  let barStartY = 0;

  wrap.addEventListener('mousedown', (e) => {
    // Only drag if not clicking buttons
    if (e.target.classList.contains('zb-btn')) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = bar.getBoundingClientRect();
    barStartX = rect.left;
    barStartY = rect.top;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    bar.style.left = `${barStartX + dx}px`;
    bar.style.top = `${barStartY + dy}px`;
    bar.style.transform = 'none';
    bar.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Pause button
  const pauseBtn = document.getElementById('zb-pause');
  pauseBtn.addEventListener('click', () => {
    if (isPaused) {
      isPaused = false;
      resumeTimer();
      pauseBtn.textContent = 'Pause';
      try {
        chrome.runtime.sendMessage({ type: 'RESUME_RECORDING' });
      } catch (_) {}
    } else {
      isPaused = true;
      pauseTimer();
      pauseBtn.textContent = 'Resume';
      try {
        chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
      } catch (_) {}
    }
  });

  // Stop button
  const stopBtn = document.getElementById('zb-stop');
  stopBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    try {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    } catch (_) {}
    bar.remove();
    style.remove();
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REMOVE_BAR') {
      clearInterval(timerInterval);
      bar.remove();
      style.remove();
    }
    if (message.type === 'BAR_PAUSE') {
      isPaused = true;
      pauseBtn.textContent = 'Resume';
    }
    if (message.type === 'BAR_RESUME') {
      isPaused = false;
      pauseBtn.textContent = 'Pause';
    }
  });

  // Start timer
  startTimer();
}
