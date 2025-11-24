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
  startView: document.getElementById('start-view'),
  resultView: document.getElementById('result-view'),

  status: document.getElementById('status'),
  progressContainer: document.getElementById('progress-container'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),

  startBtn: document.getElementById('startBtn'),
  cancelBtn: document.getElementById('cancelBtn'),

  previewGif: document.getElementById('previewGif'),
  fileInfo: document.getElementById('fileInfo'),
  downloadBtn: document.getElementById('downloadBtn'),
  resetBtn: document.getElementById('resetBtn')
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

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATE_UPDATE') {
      handleStateUpdate(message.state);
    }
  });
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
          elements.status.textContent = 'Error: GIF data missing';
        }
      } catch (e) {
        console.error('Popup: Storage error:', e);
        elements.status.textContent = 'Error reading storage: ' + e.message;
      }
    } else if (state.blobUrl) {
      currentGifBlob = state.blobUrl;
      showPreview(currentGifBlob);
    }
  }

  if (state.status === STATE.ERROR) {
    elements.status.textContent = `Error: ${state.error}`;
  }
}

function updateUI(state) {
  const { status, progress, blobUrl, error } = state;

  // Default visibility
  elements.startView.classList.remove('hidden');
  elements.resultView.classList.add('hidden');
  elements.progressContainer.classList.add('hidden');
  elements.startBtn.classList.remove('hidden');
  elements.cancelBtn.classList.add('hidden');

  switch (status) {
    case STATE.IDLE:
      elements.status.textContent = 'Ready to peel?';
      break;

    case STATE.CAPTURING:
      elements.status.textContent = 'Capturing...';
      elements.startBtn.classList.add('hidden');
      elements.cancelBtn.classList.remove('hidden');
      elements.progressContainer.classList.remove('hidden');
      updateProgress(0);
      break;

    case STATE.PROCESSING:
      elements.status.textContent = 'Mashing bananas... (Generating GIF)';
      elements.startBtn.classList.add('hidden');
      elements.progressContainer.classList.remove('hidden');
      updateProgress(progress);
      break;
  }
}

function updateProgress(percent) {
  elements.progressBar.style.width = `${percent}%`;
  elements.progressText.textContent = `${Math.round(percent)}%`;
}

async function startCapture() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome')) {
      throw new Error('Cannot capture this page.');
    }

    const settings = {
      quality: 5,
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

  // Size
  const size = Math.round((url.length * 3) / 4);
  elements.fileInfo.textContent = `GIF Ready! ${(size / (1024 * 1024)).toFixed(1)} MB`;
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
        elements.status.textContent = 'Download failed: ' + chrome.runtime.lastError.message;
      } else {
        console.log('Popup: Download started, ID:', downloadId);
      }
    });
  } catch (e) {
    console.error('Popup: Error preparing download:', e);
    elements.status.textContent = 'Download error: ' + e.message;
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
  handleStateUpdate({ status: STATE.IDLE });
}

init();
