/**
 * Safely parse JSON from localStorage. Returns fallback on any failure.
 * @param {string} key - localStorage key
 * @param {*} fallback - fallback value (default null)
 * @returns {*} parsed value or fallback
 */
export function safeGetJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
