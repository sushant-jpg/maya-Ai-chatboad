import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { getDefaultModel, listModels, streamChat } from './ollama.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const projectRoot = path.resolve(__dirname, '..');
const app = createApp({ ollama: { listModels, streamChat }, projectRoot, defaultModel: getDefaultModel(), corsOrigins: process.env.CORS_ORIGINS });

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Maya is running at http://localhost:${port}`);
    console.log(`Local model: ${getDefaultModel()}`);
  });
}
