import assert from 'node:assert/strict';
import http from 'node:http';
import { afterEach, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../server/app.js';

const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

function createTestApp(overrides = {}) {
  const ollama = {
    listModels: async () => ['qwen3:4b'],
    streamChat: async ({ onToken }) => {
      onToken('```html\n<h1>Hello</h1>\n```');
    },
    ...overrides,
  };
  return createApp({ ollama, defaultModel: 'qwen3:4b' });
}

describe('Maya API', () => {
  test('GET /api/health reports Ollama and model status', async () => {
    const response = await request(createTestApp()).get('/api/health').expect(200);
    assert.deepEqual(response.body, { ok: true, ollama: 'connected', model: 'qwen3:4b', models: ['qwen3:4b'] });
  });

  test('GET /api/models lists local models', async () => {
    const response = await request(createTestApp()).get('/api/models').expect(200);
    assert.deepEqual(response.body, { models: ['qwen3:4b'], defaultModel: 'qwen3:4b' });
  });

  test('health and models return useful errors when Ollama is unavailable', async () => {
    const app = createTestApp({ listModels: async () => { throw new Error('offline'); } });
    await request(app).get('/api/health').expect(503).expect(({ body }) => assert.match(body.error, /Ollama is not running/));
    await request(app).get('/api/models').expect(503).expect(({ body }) => assert.match(body.error, /Unable to list/));
  });

  test('chat rejects invalid requests', async () => {
    await request(createTestApp()).post('/api/chat').send({}).expect(400).expect(({ body }) => assert.match(body.error, /non-empty message/));
    await request(createTestApp()).post('/api/chat').send({ message: 'hello', conversation: [{ role: 'system', content: 'bad' }] }).expect(400);
  });

  test('chat returns buffered SSE tokens and done event', async () => {
    const response = await request(createTestApp()).post('/api/chat').send({ message: 'Make a simple HTML webpage', context: 99999, maxTokens: 99999 }).expect(200);
    assert.match(response.headers['content-type'], /text\/event-stream/);
    assert.match(response.text, /data: \{"token":"```html\\n<h1>Hello<\/h1>\\n```"\}/);
  });

  test('chat converts Ollama failures into an SSE error', async () => {
    const app = createTestApp({ streamChat: async () => { throw new Error('model missing'); } });
    const response = await request(app).post('/api/chat').send({ message: 'hello' }).expect(200);
    assert.match(response.text, /Ollama could not generate/);
  });

  test('client disconnect aborts Ollama generation', async () => {
    let aborted = false;
    const app = createTestApp({
      streamChat: ({ signal }) => new Promise((resolve) => {
        signal.addEventListener('abort', () => { aborted = true; resolve(); }, { once: true });
      }),
    });
    const server = http.createServer(app);
    servers.push(server);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    await new Promise((resolve) => {
      const client = http.request({ port, method: 'POST', path: '/api/chat', headers: { 'Content-Type': 'application/json' } });
      client.on('response', (response) => { response.destroy(); resolve(); });
      client.write(JSON.stringify({ message: 'long response' }));
      client.end();
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(aborted, true);
  });
});
