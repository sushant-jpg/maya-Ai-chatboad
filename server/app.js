import express from 'express';
import path from 'node:path';

export function createApp({ ollama, projectRoot, defaultModel = 'qwen3:4b', corsOrigins = process.env.CORS_ORIGINS }) {
  const app = express();
  const allowedOrigins = new Set((corsOrigins || 'http://localhost:3000,http://localhost:5500,https://sushant-jpg.github.io').split(',').map((origin) => origin.trim()).filter(Boolean));
  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (!origin || allowedOrigins.has(origin)) response.setHeader('Access-Control-Allow-Origin', origin || '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Vary', 'Origin');
    if (request.method === 'OPTIONS') return origin && !allowedOrigins.has(origin) ? response.sendStatus(403) : response.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  const sendEvent = (response, payload) => response.write(`data: ${JSON.stringify(payload)}\n\n`);

  app.get('/api/health', async (_request, response) => {
    try {
      const models = await ollama.listModels();
      response.json({ ok: true, ollama: 'connected', model: defaultModel, models });
    } catch (_error) {
      response.status(503).json({ ok: false, ollama: 'unavailable', error: 'Ollama is not running or cannot be reached' });
    }
  });

  app.get('/api/models', async (_request, response) => {
    try {
      response.json({ models: await ollama.listModels(), defaultModel });
    } catch (_error) {
      response.status(503).json({ error: 'Unable to list Ollama models. Start Ollama with: ollama serve' });
    }
  });

  app.post('/api/chat', async (request, response) => {
    const { message, conversation = [], model = defaultModel, temperature = 0.7, context = 4096, maxTokens = 512 } = request.body || {};
    if (typeof message !== 'string' || !message.trim()) return response.status(400).json({ error: 'A non-empty message is required' });
    if (!Array.isArray(conversation) || conversation.some((item) => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string')) {
      return response.status(400).json({ error: 'Conversation must be an array of user and assistant messages' });
    }
    if (typeof model !== 'string' || !model.trim()) return response.status(400).json({ error: 'A model name is required' });

    response.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    response.flushHeaders();
    const abortController = new AbortController();
    request.on('aborted', () => abortController.abort());
    response.on('close', () => {
      if (!response.writableEnded) abortController.abort();
    });

    try {
      const limitedConversation = conversation.slice(-20).map(({ role, content }) => ({ role, content: content.slice(-8000) }));
      await ollama.streamChat({
        message: message.trim(),
        conversation: limitedConversation,
        model: model.trim(),
        temperature: Number(temperature),
        context: Math.min(Math.max(Number(context) || 4096, 512), 8192),
        maxTokens: Math.min(Math.max(Number(maxTokens) || 512, 128), 2048),
        signal: abortController.signal,
        onToken: (token) => sendEvent(response, { token }),
      });
      if (!response.writableEnded) {
        sendEvent(response, { done: true });
        response.end();
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      const messageText = error.name === 'TimeoutError' ? 'Ollama timed out while generating a response' : 'Ollama could not generate a response. Check that the model is installed.';
      if (!response.writableEnded) {
        sendEvent(response, { error: messageText });
        response.end();
      }
    }
  });

  if (projectRoot) {
    app.use(express.static(projectRoot));
    app.get('*', (_request, response) => response.sendFile(path.join(projectRoot, 'index.html')));
  }

  return app;
}
