// Content script for scrolling

const SCROLL_DELAY = 800;    // delay between pages
const SCROLL_DURATION = 600; // animation time

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_AUTO_SCROLL') {
    startAutoScroll();
    sendResponse({ success: true });
  }
  return true;
});

function startAutoScroll() {
  const pages = Math.ceil(document.body.scrollHeight / window.innerHeight);
  let page = 0;
  let direction = 1;
  let stopped = false;

  function smoothScrollTo(target) {
    target = Math.round(target);
    const start = Math.round(window.scrollY);
    const change = target - start;
    const startTime = performance.now();

    function animate(time) {
      const t = Math.min((time - startTime) / SCROLL_DURATION, 1);
      const ease = t * (2 - t); // no bounce

      window.scrollTo(0, start + change * ease);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        window.scrollTo(0, target);
      }
    }

    requestAnimationFrame(animate);
  }

  function nextPage() {
    if (stopped) return;

    page += direction;
    smoothScrollTo(page * window.innerHeight);

    // if reached bottom, reverse direction
    if (page === pages - 1) direction = -1;

    // if returned to top, stop entirely
    if (page === 0 && direction === -1) {
      stopped = true;
      // Notify background
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'SCROLL_COMPLETE' });
      }, 500); // Small buffer after last scroll
      return;
    }

    setTimeout(nextPage, SCROLL_DURATION + SCROLL_DELAY);
  }

  // Start
  // Initial scroll to top just in case
  window.scrollTo(0, 0);
  setTimeout(nextPage, 1000); // Wait a sec before starting
}
