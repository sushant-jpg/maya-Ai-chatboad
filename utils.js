/**
 * Creates a short unique identifier.
 * @returns {string} Unique id.
 */
export function createId() {
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Escapes HTML so content is rendered safely.
 * @param {string} value - Raw content.
 * @returns {string} Escaped content.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a timestamp for display.
 * @param {string | Date} value - Timestamp.
 * @returns {string} Human-readable time.
 */
export function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Debounces a function call.
 * @param {Function} callback - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(callback, delay = 120) {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}
