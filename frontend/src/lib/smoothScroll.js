/**
 * Smooth scroll to a target Y position with easeInOutCubic easing.
 * @param {number} targetY - Target scroll position
 * @param {number} duration - Animation duration in ms (default 900)
 */
export function smoothScrollTo(targetY, duration = 900) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  let startTime = null;
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    window.scrollTo(0, startY + diff * ease(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Scroll to a DOM element, accounting for sticky header offset.
 * @param {string} selector - CSS selector for target element
 */
export function scrollToElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    const headerHeight = document.querySelector('header')?.offsetHeight || 0;
    const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
    smoothScrollTo(top);
  }
}
