// Use same-origin API calls in containers/Codespaces; support a separate local Live Server too.
const separateDevServer = window.location.protocol === 'file:' || (window.location.hostname === 'localhost' && window.location.port && window.location.port !== '3000');
const API_BASE = window.MAYA_API_BASE || (separateDevServer ? 'http://localhost:3000/api' : '/api');
const REQUEST_TIMEOUT_MS = 120000;

export async function streamResponse({ message, conversation, options = {}, onToken, signal }) {
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(new Error('Request timed out')), REQUEST_TIMEOUT_MS);
  const abortHandler = () => timeoutController.abort(signal.reason || new DOMException('Generation stopped', 'AbortError'));
  signal?.addEventListener('abort', abortHandler, { once: true });

  try {
  let response;
  try {
    response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: timeoutController.signal,
    body: JSON.stringify({ message, conversation, ...options }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Maya backend is unavailable. Start Ollama and run npm run server.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Backend request failed (${response.status})`);
  }

  if (!response.body) throw new Error('Streaming is not supported by this browser');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const line = event.split('\n').find((item) => item.startsWith('data: '));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.error) throw new Error(payload.error);
      if (payload.token) onToken(payload.token);
      if (payload.done) return;
    }

    if (done) break;
  }
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortHandler);
  }
}

export async function getModels() {
  const response = await fetch(`${API_BASE}/models`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load local models');
  return data.models || [];
}
