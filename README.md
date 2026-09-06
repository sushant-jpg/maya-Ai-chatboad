# Maya Local LLM Assistant

Maya is a local-first ChatGPT-like assistant built with vanilla HTML/CSS/JavaScript, Node.js, Express, Ollama, and Qwen3 4B. The existing Maya interface is preserved.

```text
Maya frontend -> Express API -> Ollama -> qwen3:4b
```

No OpenAI, Gemini, OpenRouter, DeepSeek, paid API, or API key is used.

## Repository Layout

```text
.
├── index.html, *.css, *.js       Maya frontend
├── server/app.js                 Injectable Express application
├── server/server.js              Production entrypoint
├── server/ollama.js              Ollama provider adapter
├── tests/                        Backend and frontend safeguard tests
├── Dockerfile                    Production container
├── docker-compose.yml             Maya + Ollama development stack
├── .devcontainer/                GitHub Codespaces configuration
└── .github/workflows/             CI and manual deployment workflows
```

## Requirements

- Node.js 22+ and npm
- Ollama 0.9+ for Qwen3 `think: false` support
- 16 GB RAM recommended
- NVIDIA GPU is optional. A 4 GB RTX 3050 works best with a quantized 4B model, but the runtime may fall back to CPU depending on installed GPU drivers.

## GitHub Repository Setup

```bash
git clone https://github.com/sushant-jpg/maya-Ai-chatboad.git
cd maya-Ai-chatboad
npm ci
cp .env.example .env
```

Do not commit `.env`, `node_modules`, model files, or secrets. They are covered by `.gitignore` and `.dockerignore`.

## GitHub Pages Frontend Configuration

This repository uses plain HTML/CSS/JavaScript rather than Vite. The Pages workflow runs `npm run build`, which copies the frontend into `dist/` and generates `dist/config.js` from the `VITE_API_URL` GitHub Actions repository variable.

Set this variable in **GitHub -> Settings -> Secrets and variables -> Actions -> Variables**:

```text
VITE_API_URL=https://YOUR-BACKEND-DOMAIN.example.com
```

Use the backend origin only. Do not include `/api`; the frontend adds `/api` automatically. For example, the final request is `https://YOUR-BACKEND-DOMAIN.example.com/api/chat`.

Then set **Settings -> Pages -> Build and deployment -> Source** to **GitHub Actions** and push to `main`. The workflow in `.github/workflows/pages.yml` deploys the generated `dist/` directory to:

```text
https://sushant-jpg.github.io/maya-Ai-chatboad/
```

For local development, the committed `config.js` is empty. The frontend uses the same-origin Express API on port `3000`, or uses `http://localhost:3000/api` when opened through a separate local static server.

## Local Development

Install Ollama:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Start Ollama as your normal user, then download Qwen:

```bash
ollama serve
ollama pull qwen3:4b
```

In another terminal:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Use `npm run server` when you want a non-watch production-style process.

Available scripts:

- `npm run dev`: starts Express with Node watch mode
- `npm run server`: starts Express on `PORT`
- `npm test`: runs API, streaming, cancellation, offline, and frontend safeguard tests
- `npm run build`: checks all JavaScript files
- `npm start`: starts the production server

## Environment Variables

Copy `.env.example` to `.env`:

- `PORT`: Maya port, default `3000`
- `OLLAMA_URL`: Ollama URL, default `http://127.0.0.1:11434`
- `OLLAMA_MODEL`: default `qwen3:4b`
- `OLLAMA_TIMEOUT_MS`: request timeout, default `120000`

The UI defaults are also constrained server-side: context defaults to `2048` and is capped at `4096`; output defaults to `256` and is capped at `1024`.

## Docker Development

The Compose stack runs Maya and Ollama as separate services. Model data is stored in the named `ollama-data` volume, not in Git.

```bash
docker compose up --build -d

docker compose exec ollama ollama pull qwen3:4b
# Open http://localhost:3000
```

Check the services:

```bash
docker compose ps
curl http://localhost:3000/api/health
```

Stop the stack:

```bash
docker compose down
```

For NVIDIA container GPU acceleration, install the NVIDIA Container Toolkit and enable the commented device reservation in `docker-compose.yml` on the GPU host. Docker cannot provide an NVIDIA GPU inside ordinary GitHub-hosted runners.

Build only the Maya image:

```bash
docker build -t maya-local-llm .
docker run --rm -p 3000:3000 --env-file .env maya-local-llm
```

## GitHub Codespaces

1. Push the repository to GitHub.
2. Open the repository and choose **Code -> Codespaces -> Create codespace on main**.
3. Codespaces automatically uses `.devcontainer/devcontainer.json`.
4. Dependencies install through `npm ci`; JavaScript validation runs after container start.
5. Run `npm run dev` and open forwarded port `3000` from the Ports panel.

Codespaces is suitable for frontend/backend development and tests. It normally does not provide an NVIDIA GPU, so run Ollama on a separate machine and set `OLLAMA_URL` to a reachable private endpoint, or use Docker locally for the full model stack. Do not expose Ollama publicly without network controls.

## API

- `GET /api/health`: reports Ollama connectivity and installed model names
- `GET /api/models`: lists installed local models
- `POST /api/chat`: accepts `{ message, conversation, model, temperature, context, maxTokens }` and returns an SSE stream

The stream is buffered in the browser and flushed to the active message approximately every 75 ms. Markdown is rendered only after generation completes. Stop Generation uses `AbortController` and the backend propagates disconnects to Ollama.

## Tests and CI

Run locally:

```bash
npm run build
npm test
```

`.github/workflows/ci.yml` runs on pushes to `main` and pull requests. It performs JavaScript checks, backend/frontend tests, and a Docker build verification. It does not download a model or call a cloud service.

Dependabot checks npm and GitHub Actions dependencies weekly.

## Deployment

GitHub Pages cannot run Node.js, Express, Ollama, or Qwen. This project does not pretend GitHub Pages hosts the LLM.

A real hosted deployment has three parts:

```text
GitHub repository / CI -> backend host -> Ollama on a GPU or CPU host
                                      -> qwen3:4b model volume
```

Recommended options:

1. **Single GPU server:** clone the repository on a Linux/NVIDIA host, run Docker Compose, pull `qwen3:4b`, and expose only the Maya port through a reverse proxy with HTTPS.
2. **Separate services:** run the Node/Express container on a normal server and set `OLLAMA_URL` to a private Ollama host. Restrict the Ollama port with a firewall or private network.
3. **Codespaces development:** use Codespaces for code and tests, but keep inference on a separate machine.

The GitHub Pages frontend cannot reach `localhost` on your computer. It must use the public HTTPS URL of the separately deployed Express backend through `VITE_API_URL`. That backend must be configured with:

```env
CORS_ORIGINS=https://sushant-jpg.github.io
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
```

The backend's `POST /api/chat` route accepts JSON and its OPTIONS handler accepts the GitHub Pages origin. Test it after deployment with:

```bash
curl -i -X OPTIONS https://YOUR-BACKEND-DOMAIN.example.com/api/chat \
    -H 'Origin: https://sushant-jpg.github.io' \
    -H 'Access-Control-Request-Method: POST'

curl -N https://YOUR-BACKEND-DOMAIN.example.com/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"message":"Hello"}'
```

`.github/workflows/deploy.yml` is a manual SSH deployment template. Configure these GitHub Environment secrets before using it:

- `DEPLOY_HOST`
- `DEPLOY_PORT` (optional)
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `DEPLOY_ENV_FILE` containing the deployment environment file

The target host must already have Docker, Docker Compose, Git, and access to the required GPU runtime if GPU acceleration is desired. Review the workflow and secure the host before enabling production deployment.

## Security and Limitations

- All chat history is stored in the browser's local storage; it is not a server database.
- Generated HTML is escaped and displayed inside code blocks. Maya never injects generated HTML as executable page markup.
- Ollama is local by default, but changing `OLLAMA_URL` can point inference at another private server.
- This is not authentication or multi-user authorization. Add an authenticated reverse proxy before exposing Maya beyond localhost.
- Model loading can take time on first request. Keep Ollama running and use a persistent model volume.
- A 4 GB GPU may require CPU fallback or smaller models if context/output settings are increased.
- GitHub Actions verifies the application and image but does not run Qwen because hosted runners do not provide the required model/GPU.
