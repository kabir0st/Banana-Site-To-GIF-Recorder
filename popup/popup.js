// State management
const STATE = {
  IDLE: 'idle',
  CAPTURING: 'capturing',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  ERROR: 'error'
};

let currentState = STATE.IDLE;
let capturedFrames = [];
let currentGifBlob = null;

// Default settings
const DEFAULT_SETTINGS = {
  scrollDelay: 500,
  frameDelay: 16, // Default to 60fps
  quality: 5,
  width: null, // Default to full width (null)
  overlap: 50
};

// DOM elements
const elements = {
  status: document.getElementById('status'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  startBtn: document.getElementById('startBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  resetBtn: document.getElementById('resetBtn'),
  previewArea: document.getElementById('previewArea'),
  previewGif: document.getElementById('previewGif'),
  settingsPanel: document.getElementById('settingsPanel'),
  settingsToggle: document.getElementById('settingsToggle'),
  actionsSection: document.getElementById('actionsSection'),
  scrollSpeed: document.getElementById('scrollSpeed'),
  scrollSpeedValue: document.getElementById('scrollSpeedValue'),
  frameDelay: document.getElementById('frameDelay'),
  frameDelayValue: document.getElementById('frameDelayValue'),
  gifQuality: document.getElementById('gifQuality'),
  gifWidth: document.getElementById('gifWidth'),
  overlap: document.getElementById('overlap'),
  overlapValue: document.getElementById('overlapValue')
};

// Initialize
async function init() {
  await loadSettings();
  setupEventListeners();
  updateUI();
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const settings = { ...DEFAULT_SETTINGS, ...result };

    elements.scrollSpeed.value = settings.scrollDelay;
    elements.frameDelay.value = settings.frameDelay;
    elements.gifQuality.value = settings.quality;
    elements.gifWidth.value = settings.width;
    elements.overlap.value = settings.overlap;

    updateSettingLabels();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to storage
async function saveSettings() {
  const settings = {
    scrollDelay: parseInt(elements.scrollSpeed.value),
    frameDelay: parseInt(elements.frameDelay.value),
    quality: parseInt(elements.gifQuality.value),
    width: parseInt(elements.gifWidth.value),
    overlap: parseInt(elements.overlap.value)
  };

  try {
    await chrome.storage.sync.set(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  elements.startBtn.addEventListener('click', startCapture);
  elements.cancelBtn.addEventListener('click', cancelCapture);
  elements.downloadBtn.addEventListener('click', downloadGif);
  elements.resetBtn.addEventListener('click', reset);
  elements.settingsToggle.addEventListener('click', toggleSettings);

  // Settings change listeners
  elements.scrollSpeed.addEventListener('input', () => {
    updateScrollSpeedLabel();
    saveSettings();
  });

  elements.frameDelay.addEventListener('input', () => {
    updateFrameDelayLabel();
    saveSettings();
  });

  elements.gifQuality.addEventListener('change', saveSettings);
  elements.gifWidth.addEventListener('change', saveSettings);
  elements.overlap.addEventListener('input', () => {
    updateOverlapLabel();
    saveSettings();
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_PROGRESS') {
      updateProgress(message.progress);
    } else if (message.type === 'CAPTURE_COMPLETE') {
      handleCaptureComplete(message.frames, message.settings);
    } else if (message.type === 'GIF_PROGRESS') {
      updateProgress(message.progress);
    } else if (message.type === 'GIF_COMPLETE') {
      handleGifComplete(message.blobUrl);
    } else if (message.type === 'ERROR') {
      handleError(message.error);
    }
  });
}

// Update setting labels
function updateSettingLabels() {
  updateScrollSpeedLabel();
  updateFrameDelayLabel();
  updateOverlapLabel();
}

function updateScrollSpeedLabel() {
  const value = parseInt(elements.scrollSpeed.value);
  if (value <= 300) {
    elements.scrollSpeedValue.textContent = 'Fast';
  } else if (value <= 700) {
    elements.scrollSpeedValue.textContent = 'Medium';
  } else {
    elements.scrollSpeedValue.textContent = 'Slow';
  }
}

function updateFrameDelayLabel() {
  elements.frameDelayValue.textContent = `${elements.frameDelay.value}ms`;
}

function updateOverlapLabel() {
  elements.overlapValue.textContent = `${elements.overlap.value}px`;
}

// Toggle settings panel
function toggleSettings() {
  const isVisible = elements.settingsPanel.style.display !== 'none';
  elements.settingsPanel.style.display = isVisible ? 'none' : 'block';
}

// Update UI based on state
function updateUI() {
  switch (currentState) {
    case STATE.IDLE:
      elements.status.textContent = 'Ready';
      elements.status.className = 'status';
      elements.startBtn.disabled = false;
      elements.startBtn.style.display = 'block';
      elements.cancelBtn.style.display = 'none';
      elements.actionsSection.style.display = 'none';
      elements.previewArea.style.display = 'none';
      break;

    case STATE.CAPTURING:
      elements.status.textContent = 'Capturing...';
      elements.status.className = 'status capturing';
      elements.startBtn.disabled = true;
      elements.cancelBtn.style.display = 'block';
      break;

    case STATE.PROCESSING:
      elements.status.textContent = 'Generating GIF...';
      elements.status.className = 'status processing';
      elements.startBtn.disabled = true;
      elements.cancelBtn.style.display = 'none';
      break;

    case STATE.COMPLETE:
      elements.status.textContent = 'Complete!';
      elements.status.className = 'status complete';
      elements.startBtn.style.display = 'none';
      elements.cancelBtn.style.display = 'none';
      elements.actionsSection.style.display = 'flex';
      break;

    case STATE.ERROR:
      elements.status.textContent = 'Error occurred';
      elements.status.className = 'status error';
      elements.startBtn.disabled = false;
      elements.cancelBtn.style.display = 'none';
      break;
  }
}

// Update progress
function updateProgress(percent) {
  elements.progressBar.style.setProperty('--progress-width', `${percent}%`);
  elements.progressText.textContent = `${Math.round(percent)}%`;
}

// Start capture
async function startCapture() {
  try {
    currentState = STATE.CAPTURING;
    updateUI();
    updateProgress(0);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot capture this page. Please navigate to a regular webpage.');
    }

    const settings = {
      scrollDelay: parseInt(elements.scrollSpeed.value),
      frameDelay: parseInt(elements.frameDelay.value),
      quality: parseInt(elements.gifQuality.value),
      width: parseInt(elements.gifWidth.value),
      overlap: parseInt(elements.overlap.value)
    };

    // Send message to background script to start capture
    chrome.runtime.sendMessage({
      type: 'START_CAPTURE',
      tabId: tab.id,
      settings: settings
    });

  } catch (error) {
    handleError(error.message);
  }
}

// Cancel capture
function cancelCapture() {
  chrome.runtime.sendMessage({ type: 'CANCEL_CAPTURE' });
  reset();
}

// Handle capture complete
function handleCaptureComplete(frames, settings) {
  capturedFrames = frames;
  currentState = STATE.PROCESSING;
  updateUI();
  updateProgress(50);

  // Use settings from message or fallback to current UI values
  const gifSettings = settings || {
    scrollDelay: parseInt(elements.scrollSpeed.value),
    frameDelay: parseInt(elements.frameDelay.value),
    quality: parseInt(elements.gifQuality.value),
    width: parseInt(elements.gifWidth.value),
    overlap: parseInt(elements.overlap.value)
  };

  generateGifFromFrames(frames, gifSettings);
}

// Generate GIF from frames
function generateGifFromFrames(frameDataUrls, settings) {
  return new Promise((resolve, reject) => {
    try {
      if (typeof GIF === 'undefined') {
        // Try to load GIF.js if not available
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('lib/gif.js');
        script.onload = () => {
          if (typeof GIF === 'undefined') {
            reject(new Error('GIF.js library failed to load'));
            return;
          }
          continueGifGeneration(frameDataUrls, settings, resolve, reject);
        };
        script.onerror = () => {
          reject(new Error('Failed to load GIF.js library'));
        };
        document.head.appendChild(script);
        return;
      }

      continueGifGeneration(frameDataUrls, settings, resolve, reject);
    } catch (error) {
      console.error('GIF generation error:', error);
      handleError(error.message || 'Failed to generate GIF');
      reject(error);
    }
  });
}

// Continue GIF generation (helper function)
function continueGifGeneration(frameDataUrls, settings, resolve, reject) {
  try {
    const gif = new GIF({
      workers: 2,
      quality: settings.quality,
      width: settings.width,
      workerScript: chrome.runtime.getURL('lib/gif.worker.js'),
      dither: false
    });

    let loadedFrames = 0;
    const totalFrames = frameDataUrls.length;

    if (totalFrames === 0) {
      reject(new Error('No frames to encode'));
      return;
    }

    // Load images and add frames
    frameDataUrls.forEach((frame) => {
      const img = new Image();
      img.onload = () => {
        // Use frame-specific delay if available, otherwise use settings
        const delay = frame.delay || settings.frameDelay;
        gif.addFrame(img, { delay: delay });
        loadedFrames++;

        // Update progress (50-100% for encoding)
        const progress = 50 + (loadedFrames / totalFrames) * 50;
        updateProgress(progress);

        if (loadedFrames === totalFrames) {
          gif.on('finished', function (blob) {
            const blobUrl = URL.createObjectURL(blob);
            handleGifComplete(blobUrl);
            resolve(blobUrl);
          });

          gif.on('progress', function (p) {
            const progress = 50 + (p * 50);
            updateProgress(progress);
          });

          gif.render();
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load frame image'));
      };

      // Handle both old format (string) and new format (object)
      img.src = typeof frame === 'string' ? frame : frame.dataUrl;
    });

  } catch (error) {
    console.error('GIF generation error:', error);
    handleError(error.message || 'Failed to generate GIF');
    reject(error);
  }

}

// Handle GIF complete
function handleGifComplete(blobUrl) {
  currentGifBlob = blobUrl;
  currentState = STATE.COMPLETE;
  updateUI();
  updateProgress(100);

  // Show preview
  elements.previewGif.src = blobUrl;
  elements.previewArea.style.display = 'block';
}

// Handle error
function handleError(errorMessage) {
  currentState = STATE.ERROR;
  elements.status.textContent = `Error: ${errorMessage}`;
  updateUI();
}

// Download GIF
function downloadGif() {
  if (!currentGifBlob) return;

  const filename = generateFilename();

  // Convert blob URL to blob and download
  fetch(currentGifBlob)
    .then(response => response.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
          handleError('Download failed: ' + chrome.runtime.lastError.message);
        } else {
          console.log('Download started:', downloadId);
        }
      });
    })
    .catch(error => {
      console.error('Download error:', error);
      handleError('Failed to download GIF');
    });
}

// Generate filename
function generateFilename() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `scrollgif_${dateStr}_${timeStr}.gif`;
}

// Reset
function reset() {
  currentState = STATE.IDLE;
  capturedFrames = [];
  currentGifBlob = null;
  updateProgress(0);
  updateUI();
}


// Initialize on load
init();

