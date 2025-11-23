// Content script for scrolling and page measurement

// Get page height
function getPageHeight() {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  );
}

// Get viewport height
function getViewportHeight() {
  return window.innerHeight;
}

// Get viewport width
function getViewportWidth() {
  return window.innerWidth;
}

// Scroll to position (instant)
function scrollToPosition(position) {
  window.scrollTo({
    top: position,
    behavior: 'instant'
  });
}

// Smooth scroll to position using requestAnimationFrame
function smoothScrollTo(target, duration, callback) {
  return new Promise((resolve) => {
    target = Math.round(target);
    const start = Math.round(window.pageYOffset || document.documentElement.scrollTop);
    const change = target - start;
    const startTime = performance.now();

    function animate(time) {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      // Ease out quad: t * (2 - t)
      const ease = t * (2 - t);
      
      const currentPos = Math.round(start + change * ease);
      window.scrollTo(0, currentPos);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure we land exactly on target
        window.scrollTo(0, target);
        if (callback) callback();
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

// Get current scroll position
function getCurrentScrollPosition() {
  return window.pageYOffset || document.documentElement.scrollTop;
}

// Freeze page (disable animations, etc.)
function freezePage() {
  document.body.style.overflow = 'hidden';
  // Stop animations
  const style = document.createElement('style');
  style.id = 'scrollgif-freeze';
  style.textContent = `
    *, *::before, *::after {
      animation-play-state: paused !important;
      transition: none !important;
    }
  `;
  document.head.appendChild(style);
}

// Unfreeze page
function unfreezePage() {
  document.body.style.overflow = '';
  const style = document.getElementById('scrollgif-freeze');
  if (style) {
    style.remove();
  }
}

// Wait for page to be ready
function waitForPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve, { once: true });
    }
  });
}

// Get page info
function getPageInfo() {
  return {
    height: getPageHeight(),
    viewportHeight: getViewportHeight(),
    viewportWidth: getViewportWidth(),
    currentScroll: getCurrentScrollPosition()
  };
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    const info = getPageInfo();
    sendResponse(info);
  } else if (message.type === 'SCROLL_TO') {
    scrollToPosition(message.position);
    sendResponse({ success: true });
  } else if (message.type === 'SMOOTH_SCROLL_TO') {
    smoothScrollTo(message.position, message.duration || 600).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  } else if (message.type === 'FREEZE_PAGE') {
    freezePage();
    sendResponse({ success: true });
  } else if (message.type === 'UNFREEZE_PAGE') {
    unfreezePage();
    sendResponse({ success: true });
  } else if (message.type === 'RESET_SCROLL') {
    scrollToPosition(0);
    sendResponse({ success: true });
  }
  
  return true; // Keep channel open for async response
});

// Initialize
waitForPageReady().then(() => {
  // Page is ready
});

