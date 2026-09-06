import { escapeHtml, formatTime } from './utils.js';

const state = {
  activeConversationId: null,
};

/**
 * Initializes the static UI elements.
 */
export function initUI() {
  renderSuggestions();
  initializeEventHandlers();
}

/**
 * Renders suggestion cards on the landing screen.
 */
export function renderSuggestions() {
  const suggestions = [
    'Explain JavaScript',
    'Write Python Code',
    'Create Resume',
    'Solve Math',
    'Generate HTML',
    'Debug Code',
  ];

  const container = document.getElementById('suggestions');
  container.innerHTML = suggestions
    .map((suggestion) => `<button class="suggestion-card" data-prompt="${escapeHtml(suggestion)}">${escapeHtml(suggestion)}</button>`)
    .join('');
}

/**
 * Renders the conversation list in the sidebar.
 * @param {Array} conversations - Conversation data.
 * @param {string|null} activeConversationId - Active conversation id.
 */
export function renderConversations(conversations, activeConversationId) {
  const container = document.getElementById('conversation-list');
  state.activeConversationId = activeConversationId;
  if (!conversations.length) {
    container.innerHTML = '<div class="conversation-item"><span class="conversation-item__title">No chats yet</span></div>';
    return;
  }

  container.innerHTML = conversations
    .map((conversation) => {
      const isActive = conversation.id === activeConversationId;
      return `
        <button class="conversation-item ${isActive ? 'active' : ''}" data-conversation-id="${conversation.id}">
          <span class="conversation-item__title">${escapeHtml(conversation.title || 'Untitled chat')}</span>
          <span class="conversation-item__meta">${escapeHtml(conversation.updatedAt || '')}</span>
        </button>
      `;
    })
    .join('');
}

/**
 * Renders the chat messages for an active conversation.
 * @param {Array} messages - Message array.
 */
export function renderMessages(messages) {
  const messagesContainer = document.getElementById('messages');
  if (!messages.length) {
    messagesContainer.innerHTML = '';
    return;
  }

  messagesContainer.innerHTML = messages
    .map((message) => renderMessage(message))
    .join('');

  // Auto scroll to bottom
  window.requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

export function updateStreamingMessage(message) {
  const messagesContainer = document.getElementById('messages');
  const shouldStickToBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 80;
  const messageElement = document.querySelector(`[data-message-id="${message.id}"] .message__content`);
  if (messageElement) {
    messageElement.textContent = message.content;
    if (shouldStickToBottom) window.requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }
}

/**
 * Builds the markup for a single message.
 * @param {Object} message - Message object.
 * @returns {string} HTML string.
 */
function renderMessage(message) {
  const content = renderMarkdown(message.content);
  const roleClass = message.role === 'user' ? 'message--user' : 'message--assistant';
  const avatar = message.role === 'user' ? 'You' : 'M';
  const time = message.timestamp ? formatTime(message.timestamp) : '';

  return `
    <article class="message ${roleClass}" data-message-id="${escapeHtml(message.id)}">
      <div class="message__avatar">${escapeHtml(avatar)}</div>
      <div class="message__bubble">
        <div class="message__meta">
          <span>${message.role === 'user' ? 'You' : 'Maya'}</span>
          <span>${escapeHtml(time)}</span>
        </div>
        <div class="message__content">${content}</div>
      </div>
    </article>
  `;
}

/**
 * Renders markdown-like content into HTML.
 * @param {string} content - Message content.
 * @returns {string} HTML string.
 */
function renderMarkdown(content) {
  const codeBlocks = [];
  const codePlaceholder = (index) => `\u0000CODE_BLOCK_${index}\u0000`;
  const withPlaceholders = String(content).replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_, language, code) => {
    const lang = language.trim() || 'code';
    const index = codeBlocks.push(`<div class="code-block"><div class="code-block__header"><span>${escapeHtml(lang)}</span><button class="code-block__copy" type="button">Copy</button></div><pre><code>${escapeHtml(code.trim())}</code></pre></div>`) - 1;
    return codePlaceholder(index);
  });
  let escaped = escapeHtml(withPlaceholders);

  // Handle bold
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle italic
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Handle line breaks
  escaped = escaped.replace(/\n/g, '<br />');

  codeBlocks.forEach((block, index) => {
    escaped = escaped.replace(escapeHtml(codePlaceholder(index)), block);
  });

  return escaped;
}

/**
 * Shows a toast message.
 * @param {string} message - Message to display.
 */
export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.add('hidden'), 1800);
}

/**
 * Sets the active conversation id in state.
 * @param {string|null} conversationId - Conversation id.
 */
export function setActiveConversation(conversationId) {
  state.activeConversationId = conversationId;
}

/**
 * Shows or hides the landing screen.
 * @param {boolean} visible - Whether to show the landing screen.
 */
export function setLandingVisible(visible) {
  const landing = document.getElementById('landing-screen');
  const chat = document.getElementById('chat-section');
  landing.classList.toggle('hidden', !visible);
  chat.classList.toggle('hidden', visible);
}

/**
 * Updates the theme toggle button label.
 * @param {string} theme - Current theme.
 */
export function updateThemeUI(theme) {
  const button = document.getElementById('theme-toggle');
  button.textContent = theme === 'dark' ? '☼' : '☾';
}

/**
 * Initializes document-level event handlers for UI behavior.
 */
function initializeEventHandlers() {
  document.addEventListener('click', (event) => {
    const copyButton = event.target.closest('.code-block__copy');
    if (copyButton) {
      const code = copyButton.closest('.code-block').querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => showToast('Code copied'));
    }
  });
}
