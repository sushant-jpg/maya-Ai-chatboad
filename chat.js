import { loadState, saveState } from './storage.js';
import { renderConversations, renderMessages, setActiveConversation, setLandingVisible, showToast } from './ui.js';
import { getResponse } from './api.js';
import { createId, formatTime } from './utils.js';

let provider = 'gemini';

/**
 * Initializes chat state and the initial conversation.
 */
export function initChat() {
  const state = loadState();
  if (!state.conversations?.length) {
    createNewConversation();
  }
}

/**
 * Creates a new conversation.
 * @returns {Object} Newly created conversation object.
 */
export function createNewConversation() {
  const state = loadState();
  const conversation = {
    id: createId(),
    title: 'New conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: formatTime(new Date().toISOString()),
  };

  state.conversations = [conversation, ...(state.conversations || [])];
  state.activeConversationId = conversation.id;
  saveState(state);
  return conversation;
}

/**
 * Sends the text from the composer to the selected provider.
 */
export async function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content) {
    showToast('Please enter a message');
    return;
  }

  const state = loadState();
  let conversation = state.conversations.find((item) => item.id === state.activeConversationId);
  if (!conversation) {
    conversation = createNewConversation();
  }

  const userMessage = {
    id: createId(),
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  };

  conversation.messages.push(userMessage);
  conversation.title = content.slice(0, 40) || 'New conversation';
  conversation.updatedAt = formatTime(new Date().toISOString());
  saveState(state);
  renderConversations(state.conversations, conversation.id);
  renderMessages(conversation.messages);
  input.value = '';
  input.style.height = 'auto';
  setLandingVisible(false);

  const assistantMessage = {
    id: createId(),
    role: 'assistant',
    content: 'Thinking...',
    timestamp: new Date().toISOString(),
  };
  conversation.messages.push(assistantMessage);
  saveState(state);
  renderMessages(conversation.messages);

  try {
    const reply = await getResponse(content, provider, { temperature: Number(document.getElementById('temperature-input').value) || 0.7 });
    assistantMessage.content = reply;
    conversation.updatedAt = formatTime(new Date().toISOString());
    saveState(state);
    renderMessages(conversation.messages);
    renderConversations(state.conversations, conversation.id);
  } catch (error) {
    assistantMessage.content = `Error: ${error.message}`;
    saveState(state);
    renderMessages(conversation.messages);
    showToast(error.message || 'Network error');
  }
}

/**
 * Handles suggestion click events.
 * @param {string} prompt - Prompt text.
 */
export function handleSuggestionClick(prompt) {
  const input = document.getElementById('message-input');
  input.value = prompt;
  input.focus();
}

/**
 * Deletes a conversation from storage.
 * @param {string} conversationId - Conversation id.
 */
export function deleteConversation(conversationId) {
  const state = loadState();
  state.conversations = state.conversations.filter((conversation) => conversation.id !== conversationId);
  if (state.activeConversationId === conversationId) {
    state.activeConversationId = state.conversations[0]?.id || null;
  }
  saveState(state);
  renderConversations(state.conversations, state.activeConversationId);
}

/**
 * Renames a conversation title.
 * @param {string} conversationId - Conversation id.
 * @param {string} title - New title.
 */
export function renameConversation(conversationId, title) {
  const state = loadState();
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (conversation) {
    conversation.title = title;
    saveState(state);
    renderConversations(state.conversations, state.activeConversationId);
  }
}

/**
 * Exports the chat history as a JSON file.
 */
export function exportChats() {
  const data = JSON.stringify(loadState(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'maya-chats.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Chats exported');
}

/**
 * Imports chat history from a JSON file.
 * @param {File} file - File to import.
 */
export function importChats(file) {
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const state = loadState();
      state.conversations = imported.conversations || [];
      state.activeConversationId = imported.activeConversationId || state.conversations[0]?.id || null;
      state.settings = imported.settings || state.settings || {};
      saveState(state);
      renderConversations(state.conversations, state.activeConversationId);
      showToast('Chats imported');
    } catch (error) {
      showToast('Invalid import file');
    }
  };
  reader.readAsText(file);
}

/**
 * Clears local chat data with confirmation.
 */
export function clearChats() {
  const confirmed = window.confirm('Are you sure you want to delete all chats? This action cannot be undone.');
  if (!confirmed) return;

  const state = loadState();
  state.conversations = [];
  state.activeConversationId = null;
  saveState(state);
}

/**
 * Clears the current conversation messages.
 */
export function clearCurrentChat() {
  const state = loadState();
  const conversation = state.conversations.find((c) => c.id === state.activeConversationId);
  
  if (!conversation) {
    showToast('No active chat to clear');
    return;
  }

  const confirmed = window.confirm(`Clear all messages in "${conversation.title}"? This cannot be undone.`);
  if (!confirmed) return;

  conversation.messages = [];
  conversation.title = 'Cleared chat';
  conversation.updatedAt = formatTime(new Date().toISOString());
  saveState(state);
  renderMessages([]);
  renderConversations(state.conversations, state.activeConversationId);
  showToast('Chat cleared');
}

/**
 * Sets the selected provider.
 * @param {string} nextProvider - Provider name.
 */
export function setProvider(nextProvider) {
  provider = nextProvider;
}

/**
 * Retrieves the selected provider.
 * @returns {string} Current provider.
 */
export function getProvider() {
  return provider;
}
