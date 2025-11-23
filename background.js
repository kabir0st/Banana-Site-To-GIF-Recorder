// Background service worker for ScrollGif extension

let captureInProgress = false;
let captureCancelled = false;

// Default settings
const DEFAULT_SETTINGS = {
  scrollDelay: 500,
  frameDelay: 500,
  quality: 5,
  width: 800,
  overlap: 50
};

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    startCapture(message.tabId, message.settings);
    sendResponse({ success: true });
  } else if (message.type === 'CANCEL_CAPTURE') {
    captureCancelled = true;
    sendResponse({ success: true });
  } else if (message.type === 'DOWNLOAD_GIF') {
    downloadGif(message.blobUrl, message.filename);
    sendResponse({ success: true });
  }

  return true;
});

// Start capture process
async function startCapture(tabId, settings) {
  if (captureInProgress) {
    return;
  }

  captureInProgress = true;
  captureCancelled = false;

  try {
    const tab = await chrome.tabs.get(tabId);

    // Check if tab is valid
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot capture this page. Please navigate to a regular webpage.');
    }

    // Inject content script if not already injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });
    } catch (error) {
      // Script might already be injected, continue
      console.log('Content script injection:', error);
    }

    // Wait a bit for script to initialize
    await sleep(200);

    // Get page info
    const pageInfo = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' });

    const { height, viewportHeight, viewportWidth } = pageInfo;

    // Update settings for full screen if needed
    if (!settings.width || settings.width === 800) {
      settings.width = viewportWidth;
    }
    
    // Use viewport width exactly (no scaling)
    settings.width = viewportWidth;

    // Freeze page
    await chrome.tabs.sendMessage(tabId, { type: 'FREEZE_PAGE' });

    // Scroll to top
    await chrome.tabs.sendMessage(tabId, { type: 'RESET_SCROLL' });

    await sleep(300);

    const frames = [];

    // Configuration from user snippet
    const pageDelay = 800;    // delay between pages
    const animDuration = 600; // animation time
    const totalPages = Math.ceil(height / viewportHeight);
    const frameDelay = 16.67; // 60 fps capture rate (1000/60)

    // Helper to capture a frame with proper timing
    const captureFrame = async (delay) => {
      try {
        // Small wait to ensure browser has rendered
        await sleep(10);
        const dataUrl = await chrome.tabs.captureVisibleTab(
          tab.windowId,
          { format: 'png' }
        );
        frames.push({ dataUrl, delay });
      } catch (error) {
        console.error('Capture error:', error);
      }
    };

    // Smooth scroll animation - capture frames during scroll
    const animateScroll = async (start, end) => {
      if (captureCancelled) return;
      
      const totalFrames = Math.round(animDuration / frameDelay); // ~36 frames for 600ms at 16.67ms (60fps)
      
      // Start smooth scroll in content script (non-blocking, uses requestAnimationFrame)
      const scrollPromise = chrome.tabs.sendMessage(tabId, {
        type: 'SMOOTH_SCROLL_TO',
        position: end,
        duration: animDuration
      }).catch(() => {});
      
      // Capture frames during the scroll animation at regular intervals
      // This creates smooth video playback
      for (let i = 0; i <= totalFrames; i++) {
        if (captureCancelled) return;
        
        // Wait for this frame's timing (except first frame)
        if (i > 0) {
          await sleep(frameDelay);
        }
        
        // Capture frame - the scroll is happening smoothly in background via requestAnimationFrame
        await captureFrame(frameDelay);
      }
      
      // Wait for scroll to fully complete
      await scrollPromise;
      await sleep(20); // Small buffer to ensure final render
      
      // Final frame at exact target position
      await captureFrame(frameDelay);
    };
    for (let page = 0; page < totalPages; page++) {
      if (captureCancelled) break;

      // Calculate target position (page * viewportHeight)
      // Ensure we don't scroll past bottom
      const targetY = Math.min(page * viewportHeight, height - viewportHeight);
      const startY = (page === 0) ? 0 : Math.min((page - 1) * viewportHeight, height - viewportHeight);

      // If it's the first page, we are already at 0, but we might want to capture the initial state?
      // The loop logic:
      // Page 0: Start 0, Target 0. (Just wait)
      // Page 1: Start 0, Target VH.

      if (page > 0) {
        const prevY = Math.min((page - 1) * viewportHeight, height - viewportHeight);
        // Animate from previous page to current page
        await animateScroll(prevY, targetY);
      } else {
        // Initial frame at top
        await captureFrame(frameDelay);
      }

      // Pause between pages
      await sleep(pageDelay);
      // Capture "pause" frame
      await captureFrame(pageDelay);

      // Update progress (0-50%)
      const progress = ((page + 1) / totalPages) * 50;
      try {
        chrome.runtime.sendMessage({ type: 'CAPTURE_PROGRESS', progress }).catch(() => { });
      } catch (e) { }
    }

    // --- UPWARD SCROLL ---
    if (!captureCancelled) {
      for (let page = totalPages - 2; page >= 0; page--) {
        if (captureCancelled) break;

        const startY = Math.min((page + 1) * viewportHeight, height - viewportHeight);
        const targetY = Math.min(page * viewportHeight, height - viewportHeight);

        // Animate up
        await animateScroll(startY, targetY);

        // Pause
        await sleep(pageDelay);
        await captureFrame(pageDelay);

        // Update progress (50-100%)
        const progress = 50 + (((totalPages - 1) - page) / totalPages) * 50;
        try {
          chrome.runtime.sendMessage({ type: 'CAPTURE_PROGRESS', progress }).catch(() => { });
        } catch (e) { }
      }
    }

    // Reset scroll and unfreeze
    await chrome.tabs.sendMessage(tabId, { type: 'RESET_SCROLL' });
    await chrome.tabs.sendMessage(tabId, { type: 'UNFREEZE_PAGE' });

    if (captureCancelled) {
      captureInProgress = false;
      return;
    }

    // Use viewport width for GIF encoding (full browser window size)
    const finalSettings = { ...settings, width: viewportWidth };

    // Notify capture complete
    try {
      chrome.runtime.sendMessage({
        type: 'CAPTURE_COMPLETE',
        frames: frames,
        settings: finalSettings
      }).catch(() => {
        console.warn('Popup might be closed');
      });
    } catch (e) {
      console.warn('Failed to send capture complete message:', e);
    }

  } catch (error) {
    console.error('Capture error:', error);
    try {
      chrome.runtime.sendMessage({
        type: 'ERROR',
        error: error.message || 'An error occurred during capture'
      }).catch(() => { });
    } catch (e) { }
  } finally {
    captureInProgress = false;
  }
}



// Utility: Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

