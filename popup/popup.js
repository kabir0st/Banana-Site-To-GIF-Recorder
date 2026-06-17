// State management
const STATE = {
  IDLE: 'IDLE',
  CAPTURING: 'CAPTURING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
};

// DOM elements
const elements = {
  startView: document.getElementById('startView'),
  resultView: document.getElementById('resultView'),

  display: document.getElementById('display'),
  status: document.getElementById('status'),
  displaySub: document.getElementById('displaySub'),
  progressFill: document.getElementById('progressFill'),
  progressPercent: document.getElementById('progressPercent'),

  startBtn: document.getElementById('startBtn'),
  cancelBtn: document.getElementById('cancelBtn'),

  previewGif: document.getElementById('previewGif'),
  fileInfo: document.getElementById('fileInfo'),
  downloadBtn: document.getElementById('downloadBtn'),
  resetBtn: document.getElementById('resetBtn'),

  fpsGroup: document.getElementById('fpsGroup'),
  qualityGroup: document.getElementById('qualityGroup'),
  controls: document.querySelector('.controls'),

  illustration: document.querySelector('.illustration')
};

let currentGifBlob = null;

async function init() {
  setupEventListeners();

  // Restore state
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  handleStateUpdate(state);
}

function setupEventListeners() {
  elements.startBtn.addEventListener('click', startCapture);
  elements.cancelBtn.addEventListener('click', cancelCapture);
  elements.downloadBtn.addEventListener('click', downloadGif);
  elements.resetBtn.addEventListener('click', reset);

  // Segmented control listeners
  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const group = e.target.closest('.segmented');
      group.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATE_UPDATE') {
      handleStateUpdate(message.state);
    } else if (message.type === 'SCROLL_ROTATION') {
      triggerRotation(message.direction);
    }
  });
}

function triggerRotation(direction) {
  if (!elements.illustration) return;

  elements.illustration.classList.remove('spinning', 'spinning-reverse');

  const rotationClass = direction === -1 ? 'spinning-reverse' : 'spinning';
  elements.illustration.classList.add(rotationClass);

  setTimeout(() => {
    elements.illustration.classList.remove('spinning', 'spinning-reverse');
  }, 1000);
}

async function handleStateUpdate(state) {
  updateUI(state);

  if (state.status === STATE.PROCESSING || state.status === STATE.CAPTURING) {
    updateProgress(state.progress);
  }

  if (state.status === STATE.COMPLETE) {
    if (state.blobUrl === 'STORAGE') {
      console.log('Popup: Retrieving GIF from storage...');
      try {
        const result = await chrome.storage.local.get('gifData');
        if (result.gifData) {
          console.log('Popup: GIF retrieved from storage.');
          currentGifBlob = result.gifData;
          showPreview(currentGifBlob);
        } else {
          console.error('Popup: GIF data missing from storage');
          setDisplay('GIF data missing', 'Please try again');
        }
      } catch (e) {
        console.error('Popup: Storage error:', e);
        setDisplay('Storage error', e.message);
      }
    } else if (state.blobUrl) {
      currentGifBlob = state.blobUrl;
      showPreview(currentGifBlob);
    }
  }

  if (state.status === STATE.ERROR) {
    setDisplay('Something slipped', state.error || 'Please try again');
  }
}

function updateUI(state) {
  const { status } = state;

  // Reset shared elements first
  elements.startView.classList.add('hidden');
  elements.resultView.classList.add('hidden');
  elements.startBtn.classList.add('hidden');
  elements.cancelBtn.classList.add('hidden');
  elements.display.classList.remove('busy', 'recording');

  switch (status) {
    case STATE.IDLE:
      elements.startView.classList.remove('hidden');
      elements.startBtn.classList.remove('hidden');
      elements.startBtn.disabled = false;
      elements.startBtn.textContent = 'Start Recording';
      setDisplay('Ready to peel?', 'Banana Gif Recorder');
      setControlsDisabled(false);
      updateProgress(0);
      break;

    case STATE.CAPTURING:
      elements.startView.classList.remove('hidden');
      elements.cancelBtn.classList.remove('hidden');
      elements.display.classList.add('busy', 'recording');
      setDisplay('Capturing…', 'Scrolling through the page');
      setControlsDisabled(true);
      break;

    case STATE.PROCESSING:
      elements.startView.classList.remove('hidden');
      elements.cancelBtn.classList.remove('hidden');
      elements.display.classList.add('busy');
      setDisplay('Mashing bananas…', 'Rendering frames');
      setControlsDisabled(true);
      break;

    case STATE.COMPLETE:
      elements.resultView.classList.remove('hidden');
      // Preview + display copy handled in showPreview
      break;

    case STATE.ERROR:
      elements.startView.classList.remove('hidden');
      elements.startBtn.classList.remove('hidden');
      elements.startBtn.disabled = false;
      elements.startBtn.textContent = 'Try Again';
      setControlsDisabled(false);
      break;
  }
}

function setDisplay(status, sub) {
  if (status !== undefined) elements.status.textContent = status;
  if (sub !== undefined) elements.displaySub.textContent = sub;
}

function setControlsDisabled(disabled) {
  document.querySelectorAll('.seg-btn').forEach(b => { b.disabled = disabled; });
  if (elements.controls) elements.controls.classList.toggle('disabled', disabled);
}

function updateProgress(percent) {
  const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
  elements.progressFill.style.width = p + '%';
  elements.progressPercent.textContent = p + '%';
}

async function startCapture() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome')) {
      throw new Error('Cannot capture this page.');
    }

    const settings = {
      qualityPreset: elements.qualityGroup.querySelector('.active').dataset.value,
      fps: parseInt(elements.fpsGroup.querySelector('.active').dataset.value, 10),
      width: null
    };

    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId: tab.id,
      settings: settings
    });

    handleStateUpdate({ status: STATE.CAPTURING, progress: 0 });

  } catch (error) {
    handleStateUpdate({ status: STATE.ERROR, error: error.message });
  }
}

function cancelCapture() {
  chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
  reset();
}

function showPreview(url) {
  elements.previewGif.src = url;
  elements.startView.classList.add('hidden');
  elements.resultView.classList.remove('hidden');

  // Estimate size from the base64 payload
  const size = Math.round((url.length * 3) / 4);
  const sizeMb = (size / (1024 * 1024)).toFixed(1);
  elements.fileInfo.textContent = `GIF Ready! ${sizeMb} MB`;
  setDisplay('GIF ready!', `${sizeMb} MB · ready to download`);
}

function downloadGif() {
  if (!currentGifBlob) {
    console.error('Popup: No GIF to download');
    return;
  }

  console.log('Popup: Starting download...');

  try {
    // Convert Base64 to Blob for better download handling
    const base64Data = currentGifBlob.split(',')[1];
    const blob = base64ToBlob(base64Data, 'image/gif');
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const filename = `banana_gif_${now.getTime()}.gif`;

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Popup: Download failed:', chrome.runtime.lastError);
        setDisplay('Download failed', chrome.runtime.lastError.message);
      } else {
        console.log('Popup: Download started, ID:', downloadId);
      }
    });
  } catch (e) {
    console.error('Popup: Error preparing download:', e);
    setDisplay('Download error', e.message);
  }
}

function base64ToBlob(base64, type) {
  const binStr = atob(base64);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type: type });
}

function reset() {
  chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
  currentGifBlob = null;
  elements.previewGif.src = '';
  updateUI({ status: STATE.IDLE });
}

init();
