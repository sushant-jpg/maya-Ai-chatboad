const STORAGE_KEY = 'maya-state';

/**
 * Loads the persisted app state from localStorage.
 * @returns {Object} Stored state object.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { conversations: [], theme: 'dark', settings: {} };
  } catch (error) {
    return { conversations: [], theme: 'dark', settings: {} };
  }
}

/**
 * Saves the app state to localStorage.
 * @param {Object} state - New state object.
 */
export function saveState(state) {
  const nextState = { ...loadState(), ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
