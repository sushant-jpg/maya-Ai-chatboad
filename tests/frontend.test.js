import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { describe, test } from 'node:test';

const read = (file) => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');

describe('Maya frontend safeguards', () => {
  test('buffers streamed tokens and throttles DOM updates', async () => {
    const source = await read('chat.js');
    assert.match(source, /streamBuffer/);
    assert.match(source, /setTimeout\(\(\) => flushStream[\s\S]*75/);
    assert.doesNotMatch(source, /onToken: \(token\) => \{\s*assistantMessage\.content \+= token;\s*renderMessages/);
  });

  test('supports AbortController, Stop Generation, and request locking', async () => {
    const chat = await read('chat.js');
    const html = await read('index.html');
    const api = await read('api.js');
    assert.match(chat, /new AbortController/);
    assert.match(chat, /if \(isSending\) return/);
    assert.match(html, /id="stop-btn"/);
    assert.match(api, /REQUEST_TIMEOUT_MS = 120000/);
  });

  test('keeps generated code escaped and never calls external AI APIs', async () => {
    const ui = await read('ui.js');
    const api = await read('api.js');
    assert.match(ui, /escapeHtml\(code\.trim\(\)\)/);
    assert.match(ui, /textContent = message\.content/);
    assert.doesNotMatch(api, /openai|gemini|openrouter|deepseek/i);
    assert.match(api, /window\.MAYA_API_BASE/);
  });

  test('keeps requested model and generation defaults in the UI', async () => {
    const html = await read('index.html');
    const server = await read('server/app.js');
    assert.match(html, /qwen3:4b/);
    assert.match(html, /value="4096"/);
    assert.match(html, /value="512"/);
    assert.match(server, /context = 4096/);
    assert.match(server, /maxTokens = 512/);
  });

  test('build configuration supports GitHub Pages backend injection', async () => {
    const index = await read('index.html');
    const api = await read('api.js');
    const build = await read('scripts/build-frontend.mjs');
    assert.match(index, /config\.js/);
    assert.match(api, /configuredApiUrl \? `\$\{configuredApiUrl\}\/api`/);
    assert.match(build, /VITE_API_URL/);
    assert.match(build, /GITHUB_ACTIONS/);
  });
});
