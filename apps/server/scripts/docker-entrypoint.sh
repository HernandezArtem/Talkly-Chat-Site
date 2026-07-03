#!/bin/sh
# Seeds bundled demo content on first boot so `docker run` is interactive out of
# the box. Skips silently if a DB already exists or if no embeddings API key is
# set. Runs in the same process environment as the server.
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
SEED_MARKER="$DATA_DIR/.seeded"

should_seed() {
  [ "${TALKLY_AUTOSEED:-1}" = "1" ] || return 1
  [ -f "$SEED_MARKER" ] && return 1
  # Embeddings need either OpenAI (covers OpenAI/Anthropic) or a local/Azure setup.
  [ -n "$OPENAI_API_KEY" ] || [ "$TALKLY_PROVIDER" = "ollama" ] || [ "$TALKLY_PROVIDER" = "azure-openai" ] || return 1
  return 0
}

if should_seed; then
  echo "[talkly] First boot: seeding bundled demo content..."
  if node dist/scripts/seed-demo.js; then
    touch "$SEED_MARKER"
  else
    echo "[talkly] Demo seed failed; starting server anyway. Run 'pnpm seed-demo' to retry."
  fi
fi

exec node dist/index.js
