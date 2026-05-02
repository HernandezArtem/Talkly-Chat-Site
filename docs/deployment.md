# Deployment

Chattr is self-hosted by design. Docker is the fastest way to get to a production-like setup, and the Ubuntu VPS path is there if you want a simple VM install with full control.

## Environment Variables

Set these in `apps/server/.env` for production and `apps/server/.env.local` for local development.

- `OPENAI_API_KEY` Required for the OpenAI provider and default embeddings.
- `ANTHROPIC_API_KEY` Required for the Anthropic provider.
- `CHATTR_PROVIDER` `openai`, `anthropic`, `azure-openai`, or `ollama`. Defaults to `openai`.
- `CHATTR_MODEL` Chat model or deployment name. Defaults to the provider's default (e.g. `gpt-4o` for OpenAI, `llama3.2` for Ollama).
- `CHATTR_ADMIN_KEY` Bearer token for `POST /api/ingest`. Strongly recommended in production.
- `CHATTR_DB_PATH` Default SQLite database path. Defaults to `./data/chattr.db`. Per-tenant paths live in the instance config.
- `CHATTR_AUTOSEED` Set to `0` to skip the Docker entrypoint's first-boot demo seed. Defaults to `1`. Only runs once per volume (guarded by `/app/data/.seeded`).
- `CHATTR_RUNTIME_LOGS` Enable runtime event logs. Defaults to on in production.
- `CHATTR_LOG_CONTENT` Include message content in logs. Defaults to off.
- `CHATTR_LOG_MAX_CHARS` Max characters to store when content logging is enabled. Defaults to `4000`.
- `PORT` HTTP port. Defaults to `3000`.
- `AZURE_OPENAI_API_KEY` Required when `CHATTR_PROVIDER=azure-openai`.
- `AZURE_OPENAI_RESOURCE_NAME` Azure OpenAI resource name.
- `AZURE_OPENAI_CHAT_DEPLOYMENT` Azure chat deployment override.
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` Azure embedding deployment override.
- `OLLAMA_BASE_URL` OpenAI-compatible base URL for `CHATTR_PROVIDER=ollama`. Defaults to `http://localhost:11434/v1`. Works with any compatible server (LM Studio, llama.cpp, vLLM).
- `OLLAMA_EMBEDDING_MODEL` Embedding model name. Defaults to `nomic-embed-text`.
- `OLLAMA_EMBEDDING_DIMENSIONS` Vector size for the embedding model. Must match the model: `768` for `nomic-embed-text`, `1024` for `mxbai-embed-large`. Switching models requires re-ingesting (clear `./data` first).

## Docker

Docker is the quickest path from local prototype to a persistent Chattr deployment.

```bash
docker build -t chattr .

docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e CHATTR_PROVIDER=openai \
  -e CHATTR_MODEL=gpt-4o \
  -e CHATTR_ADMIN_KEY=your-secret-key \
  -v chattr-data:/app/data \
  chattr
```

The image includes the default tenant registry, guardrails config, static assets, widget bundle, and bundled demo seed content. On first boot, the entrypoint seeds the demo content into `/app/data/default.db` if the volume is empty and an embeddings-capable API key is set. Mount `/app/data` to persist the SQLite database.

## Ubuntu VPS

If you'd rather run on a plain server, this setup keeps the stack straightforward: Node, pnpm, Chattr, and a reverse proxy for HTTPS.

Install system dependencies:

```bash
sudo apt update
sudo apt install -y curl git build-essential python3
```

Install Node.js 20 and pnpm:

```bash
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 20
corepack enable pnpm
```

Clone and build:

```bash
git clone https://github.com/Maxkrvo/Chattr.git
cd Chattr
pnpm install
cp apps/server/.env.example apps/server/.env
pnpm build
```

Run it:

```bash
pnpm start
```

Or keep it alive with `pm2`:

```bash
npm i -g pm2
pm2 start pnpm --name chattr -- start
pm2 save
pm2 startup
```

Put Caddy, Nginx, or another reverse proxy in front for HTTPS and domain routing.

## Security Notes

- Set `CHATTR_ADMIN_KEY` before exposing `/api/ingest` publicly.
- Use `allowedOrigins` per tenant if the widget should only load on approved domains.
- Review `CHATTR_LOG_CONTENT` before enabling it in production, especially on websites that may receive sensitive user input.
