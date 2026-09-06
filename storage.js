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
 * @param {Object} state - New state object or partial update.
 * @param {boolean} replace - Whether state is already complete.
 */
export function saveState(state, replace = false) {
  const nextState = replace ? state : { ...loadState(), ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
