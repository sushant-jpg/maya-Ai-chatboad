import { initUI, renderConversations, renderMessages, updateThemeUI, showToast, setActiveConversation, setLandingVisible } from './ui.js';
import { initChat, sendMessage, handleSuggestionClick, createNewConversation, deleteConversation, renameConversation, exportChats, importChats, clearChats, clearCurrentChat, setProvider, getProvider } from './chat.js';
import { loadState, saveState } from './storage.js';
import { initTheme } from './theme.js';
import { debounce, escapeHtml, formatTime } from './utils.js';

/**
 * Initializes the Maya application shell.
 */
function initApp() {
  const state = loadState();
  initTheme();
  initUI();
  initChat();

  const conversationState = state.conversations || [];
  const activeConversationId = state.activeConversationId || conversationState[0]?.id || null;

  renderConversations(conversationState, activeConversationId);
  if (activeConversationId) {
    const activeConversation = conversationState.find((item) => item.id === activeConversationId) || conversationState[0];
    setActiveConversation(activeConversation.id);
    renderMessages(activeConversation.messages);
    setLandingVisible(false);
  } else {
    setLandingVisible(true);
  }

  updateThemeUI(state.theme || 'dark');
  document.documentElement.setAttribute('data-font-size', state.settings?.fontSize || 'medium');
  document.documentElement.setAttribute('data-theme', state.theme || 'dark');

  document.getElementById('new-chat-btn').addEventListener('click', () => {
    const convo = createNewConversation();
    setActiveConversation(convo.id);
    renderConversations(getAllConversations(), convo.id);
    setLandingVisible(true);
    renderMessages([]);
  });

  document.getElementById('message-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('send-btn').addEventListener('click', () => sendMessage());
  document.getElementById('chat-search').addEventListener('input', debounce((event) => {
    const term = event.target.value.toLowerCase();
    const conversations = loadState().conversations || [];
    const filtered = conversations.filter((conversation) => conversation.title.toLowerCase().includes(term));
    renderConversations(filtered, getActiveConversationId());
  }, 120));

  document.querySelectorAll('.suggestion-card').forEach((button) => {
    button.addEventListener('click', () => handleSuggestionClick(button.dataset.prompt));
  });

  document.getElementById('settings-open-btn').addEventListener('click', () => document.getElementById('settings-modal').classList.remove('hidden'));
  document.getElementById('settings-close-btn').addEventListener('click', () => document.getElementById('settings-modal').classList.add('hidden'));

  document.getElementById('theme-select').addEventListener('change', (event) => {
    const value = event.target.value;
    document.documentElement.setAttribute('data-theme', value);
    saveState({ theme: value });
    updateThemeUI(value);
    showToast(`Theme switched to ${value}`);
  });

  document.getElementById('font-size-select').addEventListener('change', (event) => {
    const value = event.target.value;
    document.documentElement.setAttribute('data-font-size', value);
    const state = loadState();
    state.settings = { ...(state.settings || {}), fontSize: value };
    saveState(state);
  });

  document.getElementById('provider-select').addEventListener('change', (event) => {
    setProvider(event.target.value);
    showToast(`Provider set to ${event.target.value}`);
  });

  document.getElementById('clear-chats-btn').addEventListener('click', () => {
    clearChats();
    renderConversations([], null);
    renderMessages([]);
    setLandingVisible(true);
    showToast('Chats cleared');
  });

  document.getElementById('clear-chat-btn').addEventListener('click', () => {
    clearCurrentChat();
  });

  document.getElementById('export-chats-btn').addEventListener('click', () => exportChats());
  document.getElementById('import-chats-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
  document.getElementById('import-file-input').addEventListener('change', (event) => importChats(event.target.files[0]));
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', current);
    saveState({ theme: current });
    updateThemeUI(current);
  });

  document.getElementById('message-input').addEventListener('input', () => {
    const textarea = document.getElementById('message-input');
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  });

  document.addEventListener('click', (event) => {
    const conversationButton = event.target.closest('[data-conversation-id]');
    if (conversationButton) {
      const id = conversationButton.dataset.conversationId;
      const conversations = getAllConversations();
      const activeConversation = conversations.find((item) => item.id === id);
      if (activeConversation) {
        setActiveConversation(id);
        renderConversations(conversations, id);
        renderMessages(activeConversation.messages);
        setLandingVisible(false);
      }
    }
  });

  document.getElementById('settings-modal').addEventListener('click', (event) => {
    if (event.target.id === 'settings-modal') {
      event.target.classList.add('hidden');
    }
  });
}

/**
 * Retrieves all stored conversations.
 * @returns {Array} Conversation array.
 */
function getAllConversations() {
  return loadState().conversations || [];
}

/**
 * Retrieves the active conversation id.
 * @returns {string|null} Active conversation id.
 */
function getActiveConversationId() {
  return loadState().activeConversationId || null;
}

initApp();
