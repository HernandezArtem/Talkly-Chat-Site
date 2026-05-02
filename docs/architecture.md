# Architecture

## Project Structure

```text
chattr/
├── apps/server/      # Hono server, APIs, guardrails, RAG, instance config
├── packages/shared/  # Shared Zod schemas, tenant models, language helpers
├── packages/widget/  # Embeddable vanilla TS widget
└── Dockerfile
```

## Instance Config

The canonical source of truth lives in [`apps/server/src/instance/default/chattr.config.ts`](../apps/server/src/instance/default/chattr.config.ts).

It defines the default tenant ID and every tenant's:

- `dbPath`
- `scrapeUrl`
- `systemPrompt`
- `widget` copy and theme defaults
- `escalation` contact options
- `allowedOrigins`
- `guardrails`

If the client does not send `X-Chattr-Tenant`, Chattr falls back to `defaultTenantId`, then the `default` tenant, then the first tenant in the config.

For a step-by-step walkthrough on running many branded bots off a single deployment, see the [multi-tenant guide](multi-tenant.md).

## Guardrails

Guardrails now live inline in the canonical instance config, under each tenant's `guardrails` field.

Example:

```json
{
  "identity": {
    "role": "customer support assistant for Acme Corp",
    "personality": "professional, concise, and friendly"
  },
  "rules": {
    "allowedTopics": ["product support", "billing", "technical help"],
    "forbiddenTopics": ["politics", "medical advice", "legal advice"],
    "redirects": {
      "pricing": "For pricing information, contact sales@example.com."
    }
  },
  "inputGuardrails": {
    "maxMessageLength": 4000,
    "maxConversationLength": 50,
    "promptInjectionDetection": true,
    "rateLimitCount": 20,
    "rateLimitWindowSeconds": 60
  },
  "outputGuardrails": {
    "maxResponseTokens": 2048,
    "systemPromptLeakDetection": true,
    "contentFiltering": true
  }
}
```

Any missing guardrail fields are filled from the built-in defaults in [`apps/server/src/lib/guardrails/config.ts`](../apps/server/src/lib/guardrails/config.ts).

For the full schema, see [`apps/server/src/lib/guardrails/types.ts`](../apps/server/src/lib/guardrails/types.ts).

## API

### `POST /api/chat`

```json
{
  "messages": [
    { "id": "msg-1", "role": "user", "content": "Hello!" }
  ],
  "context": "optional context string"
}
```

Returns a Vercel AI SDK data stream. Blocked messages return a JSON payload with `blocked`, `reason`, and `message`.

### `GET /api/bootstrap`

Returns the resolved widget defaults for the requested tenant.

### `POST /api/ingest`

```json
{
  "documents": [
    { "content": "...", "metadata": { "source": "faq.md" } }
  ]
}
```

### `POST /api/feedback`

Accepts widget feedback events for thumbs up/down reporting.

### `GET /api/health`

Returns server status, active providers, document count, active tenant, and guardrail summary.
