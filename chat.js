import { loadState, saveState } from './storage.js';
import { renderConversations, renderMessages, setLandingVisible, showToast, updateStreamingMessage } from './ui.js';
import { streamResponse } from './api.js';
import { createId, formatTime } from './utils.js';

let isSending = false;
let activeAbortController = null;
let streamBuffer = '';
let streamFlushTimer = null;

function extractAnswer(content) {
  const codeStart = content.search(/```(?:c|cpp|c\+\+)?\s*\n|#include\s*</i);
  return codeStart >= 0 ? content.slice(codeStart).trim() : content.trim();
}

function setGenerationState(generating) {
  document.getElementById('send-btn').disabled = generating;
  document.getElementById('message-input').disabled = generating;
  document.getElementById('stop-btn').classList.toggle('hidden', !generating);
}

function flushStream(assistantMessage) {
  if (!streamBuffer) return;
  assistantMessage.content += streamBuffer;
  streamBuffer = '';
  updateStreamingMessage(assistantMessage);
  streamFlushTimer = null;
}

function scheduleStreamFlush(assistantMessage) {
  if (streamFlushTimer !== null) return;
  streamFlushTimer = window.setTimeout(() => flushStream(assistantMessage), 75);
}

function isActiveConversation(conversation) {
  return loadState().activeConversationId === conversation.id;
}

/**
 * Initializes chat state and the initial conversation.
 */
export function initChat() {
  const state = loadState();
  if (!state.conversations?.length) {
    createNewConversation();
    return loadState();
  }
  return state;
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
  saveState(state, true);
  return conversation;
}

/**
 * Sends the text from the composer to the selected provider.
 */
export async function sendMessage() {
  if (isSending) return;

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
  saveState(state, true);
  renderMessages(conversation.messages);

  try {
    isSending = true;
    activeAbortController = new AbortController();
    setGenerationState(true);
    assistantMessage.content = '';
    const history = conversation.messages.slice(0, -2).slice(-10).map(({ role, content: text }) => ({ role, content: text.slice(-4000) }));
    await streamResponse({
      message: content,
      conversation: history,
      options: {
        model: document.getElementById('model-select').value,
        temperature: Number(document.getElementById('temperature-input').value),
        context: Number(document.getElementById('context-input').value),
        maxTokens: Math.max(Number(document.getElementById('max-tokens-input').value) || 256, 512),
      },
      signal: activeAbortController.signal,
      onToken: (token) => {
        streamBuffer += token;
        scheduleStreamFlush(assistantMessage);
      },
    });
    flushStream(assistantMessage);
    assistantMessage.content = extractAnswer(assistantMessage.content);
    renderMessages(conversation.messages);
    conversation.updatedAt = formatTime(new Date().toISOString());
    saveState(state, true);
    if (state.activeConversationId === conversation.id) {
      renderMessages(conversation.messages);
      renderConversations(state.conversations, conversation.id);
    }
  } catch (error) {
    flushStream(assistantMessage);
    if (error.name === 'AbortError') {
      assistantMessage.content += assistantMessage.content ? '\n\n[Generation stopped]' : '[Generation stopped]';
    } else {
      assistantMessage.content = `Error: ${error.message || 'Local model request failed'}`;
      showToast(error.message || 'Local model request failed');
    }
    saveState(state, true);
    if (state.activeConversationId === conversation.id) renderMessages(conversation.messages);
  } finally {
    if (streamFlushTimer !== null) {
      window.clearTimeout(streamFlushTimer);
      streamFlushTimer = null;
    }
    isSending = false;
    activeAbortController = null;
    setGenerationState(false);
  }
}

export function stopGeneration() {
  if (activeAbortController) activeAbortController.abort();
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
      saveState(state, true);
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
  saveState(state, true);
}

/**
 * Clears the current conversation messages.
 */
export function clearCurrentChat() {
  stopGeneration();
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
  saveState(state, true);
  renderMessages([]);
  renderConversations(state.conversations, state.activeConversationId);
  showToast('Chat cleared');
}

