// Background service worker

// State management
let currentState = {
  status: 'IDLE', // IDLE, CAPTURING, PROCESSING, COMPLETE, ERROR
  progress: 0,
  blobUrl: null,
  error: null
};

// Constants
const OFFSCREEN_PATH = 'offscreen.html';

// Listen for GIF_COMPLETE in the main listener
let gifChunks = [];

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    gifChunks = []; // Reset chunks
    startCaptureFlow(message.tabId, message.settings);
    sendResponse({ success: true });
    return false;
  }
  else if (message.type === 'CANCEL_CAPTURE') {
    handleCancel();
    sendResponse({ success: true });
    return false;
  }
  else if (message.type === 'GET_STATUS') {
    sendResponse(currentState);
    return false;
  }
  else if (message.type === 'GIF_PROGRESS') {
    updateState('PROCESSING', message.progress);
    return false;
  }
  else if (message.type === 'GIF_DATA_CHUNK') {
    gifChunks[message.index] = message.chunk;
    return false;
  }
  else if (message.type === 'GIF_COMPLETE') {
    console.log('Background: All chunks received. Assembling...');
    const fullBlobUrl = gifChunks.join('');
    gifChunks = []; // Clear memory

    console.log('Background: Saving to storage...');
    chrome.storage.local.set({ gifData: fullBlobUrl }).then(() => {
      console.log('Background: Saved to storage. Updating state.');
      updateState('COMPLETE', 100, 'STORAGE'); // Signal that data is in storage
    }).catch(err => {
      console.error('Background: Storage error:', err);
      updateState('ERROR', 0, null, 'Storage error: ' + err.message);
    });

    return false;
  }
  else if (message.type === 'ERROR') {
    console.error('Background: Received error:', message.error);
    updateState('ERROR', 0, null, message.error);
    return false;
  }

  return false;
});

function updateState(status, progress = 0, blobUrl = null, error = null) {
  currentState = { status, progress, blobUrl, error };
  // Don't send the huge blobUrl in the message if it's data
  const stateToSend = { ...currentState };
  if (status === 'COMPLETE' && blobUrl === 'STORAGE') {
    stateToSend.blobUrl = 'STORAGE';
  }
  safeSendMessage({ type: 'STATE_UPDATE', state: stateToSend });
}

function handleCancel() {
  updateState('IDLE');
}

async function startCaptureFlow(tabId, settings) {
  if (currentState.status === 'CAPTURING') return;

  updateState('CAPTURING', 0);

  try {
    // 1. Setup Offscreen Document
    await setupOffscreenDocument(OFFSCREEN_PATH);

    // 2. Get Tab Stream ID
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });

    // 2.5 Get Viewport Dimensions
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio
      })
    });

    const viewport = result.result;

    // 3. Start Recording in Offscreen
    await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      streamId: streamId,
      settings: {
        ...settings,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        devicePixelRatio: viewport.dpr
      }
    });

    // 4. Start Scrolling in Content
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });
    } catch (e) { }

    await sleep(500);

    // Send start scroll command
    await chrome.tabs.sendMessage(tabId, { type: 'START_AUTO_SCROLL' });

    // Wait for scroll completion
    const scrollCompletePromise = new Promise((resolve) => {
      const listener = (msg) => {
        if (msg.type === 'SCROLL_COMPLETE') {
          chrome.runtime.onMessage.removeListener(listener);
          resolve();
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    });

    await scrollCompletePromise;

    // 5. Stop Recording and Generate GIF
    if (currentState.status !== 'CAPTURING') return; // Cancelled

    updateState('PROCESSING', 0);

    // Send stop command (returns immediately now)
    await chrome.runtime.sendMessage({
      type: 'STOP_RECORDING',
      settings: settings
    });

    // Wait for GIF_COMPLETE message from offscreen (handled by listener)

  } catch (error) {
    console.error('Capture error:', error);
    updateState('ERROR', 0, null, error.message);
  }
}

// Helper to send message safely (ignore if popup closed)
function safeSendMessage(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Ignore error if popup is closed
  });
}

// Offscreen helper functions
async function setupOffscreenDocument(path) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: path,
    reasons: ['USER_MEDIA'],
    justification: 'Recording tab video for GIF creation'
  });
}

async function closeOffscreenDocument() {
  await chrome.offscreen.closeDocument();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
