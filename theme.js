/**
 * Applies the persisted theme and related UI attributes.
 */
export function initTheme() {
  const state = JSON.parse(localStorage.getItem('maya-state') || '{}');
  const theme = state.theme || 'dark';
  const fontSize = state.settings?.fontSize || 'medium';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-font-size', fontSize);
}
