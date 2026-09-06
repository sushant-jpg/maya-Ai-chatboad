import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const frontendFiles = [
  'index.html',
  'api.js',
  'app.js',
  'chat.js',
  'storage.js',
  'ui.js',
  'utils.js',
  'chat.css',
  'responsive.css',
  'sidebar.css',
  'style.css',
];

const backendUrl = (process.env.VITE_API_URL || process.env.MAYA_API_URL || '').trim().replace(/\/$/, '');
if (process.env.GITHUB_ACTIONS === 'true' && !backendUrl) {
  throw new Error('VITE_API_URL must be set for the GitHub Pages build');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(frontendFiles.map((file) => cp(path.join(root, file), path.join(output, file))));
await writeFile(path.join(output, 'config.js'), `window.MAYA_API_BASE = ${JSON.stringify(backendUrl)};\n`);
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`Frontend built in dist${backendUrl ? ` with API ${backendUrl}` : ''}`);
