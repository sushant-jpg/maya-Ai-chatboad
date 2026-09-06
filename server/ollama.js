const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:4b';
const REQUEST_TIMEOUT = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

export async function listModels() {
  const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const data = await response.json();
  return (data.models || []).map((model) => model.name);
}

export async function streamChat({ message, conversation = [], model = DEFAULT_MODEL, temperature = 0.7, context = 4096, maxTokens = 512, signal, onToken }) {
  const messages = [
    {
      role: 'system',
      content: 'You are Maya, a helpful, intelligent, concise local AI assistant. Follow the user instructions and answer naturally. Do not write or reveal your internal reasoning, planning, or analysis. Give the final answer directly. For programming requests, return complete code in fenced Markdown code blocks with the correct language. Never invent information when uncertain; say when you do not know.',
    },
    ...conversation,
    { role: 'user', content: message },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT), signal].filter(Boolean)),
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      think: false,
      options: {
        temperature: Number.isFinite(temperature) ? temperature : 0.7,
        num_ctx: Number.isFinite(context) ? context : 4096,
        num_predict: Number.isFinite(maxTokens) ? maxTokens : 512,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Ollama returned HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line);
      if (chunk.message?.content) onToken(chunk.message.content);
      if (chunk.done) return;
    }

    if (done) return;
  }
}

export function getDefaultModel() {
  return DEFAULT_MODEL;
}
