# Multi-Tenant

Chattr can power many independently branded chatbots from one deployment. That makes it a good fit for agencies, multi-brand companies, SaaS teams with regional sites, or anyone who wants one operational stack behind multiple assistants.

Each tenant has its own:

- display name and widget theme
- SQLite vector database (fully isolated content)
- scrape source and ingestion history
- system prompt and guardrails
- escalation contacts
- allowed origins (per-tenant CORS)

This page walks through adding a second tenant to a working Chattr installation in a few minutes. For the config schema, see [`apps/server/src/instance/config.ts`](../apps/server/src/instance/config.ts).

## Launch a second tenant in about 5 minutes

### 1. Edit the instance config

Open [`apps/server/src/instance/default/chattr.config.ts`](../apps/server/src/instance/default/chattr.config.ts) and add a new entry under `tenants`:

```ts
export default defineInstanceConfig({
  defaultTenantId: "default",
  tenants: {
    default: {
      name: "Acme",
      dbPath: "./data/default.db",
      // ...existing tenant...
    },
    acme-eu: {
      name: "Acme Europe",
      dbPath: "./data/acme-eu.db",
      scrapeUrl: "https://eu.acme.com",
      systemPrompt: "You are a helpful assistant for Acme's European customers. Answer in the visitor's language. If you don't know, say so and offer the listed contact options.",
      widget: {
        theme: {
          primaryColor: "#1e40af",
          title: "Acme EU",
          subtitle: "How can we help?",
          avatarUrl: "https://eu.acme.com/logo.png",
        },
        welcomeMessage: "Hi, I'm the Acme EU assistant.",
        starterQuestions: [
          "How do I track my order?",
          "What's your return policy?",
        ],
      },
      escalation: {
        email: "support-eu@acme.com",
        url: "https://eu.acme.com/support",
      },
      allowedOrigins: ["eu.acme.com", "*.eu.acme.com"],
    },
  },
});
```

Tenant IDs are whatever string you use as the object key (`acme-eu` above). They appear in API headers and widget `data-tenant` attributes.

### 2. Ingest content for the new tenant

All ingest scripts take a `--tenant` flag. Either scrape the site you configured above, or load documents from disk:

```bash
# Scrape the tenant's configured scrapeUrl
pnpm --filter @chattr/server scrape-ingest --tenant acme-eu

# Or ingest local files
pnpm --filter @chattr/server ingest --tenant acme-eu ./path/to/docs
```

Each tenant's documents live in its own SQLite file (`./data/acme-eu.db` here), so there's no risk of cross-tenant retrieval.

### 3. Restart the server and embed the widget

```bash
pnpm build && pnpm start
```

On the tenant's website:

```html
<script
  src="https://your-chattr-server.com/widget.js"
  data-server="https://your-chattr-server.com"
  data-tenant="acme-eu"
  defer
></script>
```

That's it. The widget fetches `/api/bootstrap` with `X-Chattr-Tenant: acme-eu` and renders with the tenant's theme, welcome message, and starter questions.

## How tenant resolution works

Every request to `/api/chat`, `/api/bootstrap`, `/api/feedback`, or `/api/ingest` runs through the tenant middleware ([`apps/server/src/middleware/tenant.ts`](../apps/server/src/middleware/tenant.ts)), which picks a tenant in this order:

1. **`X-Chattr-Tenant` header** (sent automatically by the widget when `data-tenant` is set, or by a custom client).
2. **`defaultTenantId`** from the instance config.
3. **Tenant keyed `default`**, if present.
4. **First tenant** in the config object.

If the header names an unknown tenant, the request is rejected with `404 Unknown tenant: <id>`. If the tenant has `allowedOrigins` and the request's `Origin` or `Referer` doesn't match, the request is rejected with `403 Origin not allowed for this tenant`.

## Per-tenant configuration options

All fields are declared in the Zod schema at [`apps/server/src/instance/config.ts`](../apps/server/src/instance/config.ts).

| Field | Required | Purpose |
| ----- | :------: | ------- |
| `name` | yes | Display name shown in logs and the `/api/bootstrap` response. |
| `dbPath` | yes | SQLite file path for this tenant's vector store. Use a unique path per tenant. |
| `scrapeUrl` | yes | Default URL for `scrape-ingest --tenant <id>`. |
| `systemPrompt` | no | Tenant-specific operator instructions prepended to the system prompt. |
| `widget.theme` | no | Colors, title, subtitle, avatar. Overridable per-embed via `data-theme-*` attributes. |
| `widget.welcomeMessage` | no | First message shown when the widget opens. |
| `widget.starterQuestions` | no | Clickable suggestions under the welcome message. |
| `escalation` | no | Email, URL, phone, and phone hours for handoff flows. |
| `allowedOrigins` | no | Hostnames allowed to call this tenant's APIs. Supports `*.example.com` wildcards. Empty means no origin restriction. |
| `guardrails` | no | Partial guardrails config merged over the built-in defaults. See [`apps/server/src/lib/guardrails/types.ts`](../apps/server/src/lib/guardrails/types.ts). |

## Per-tenant guardrails

Guardrails accept a partial config and merge over the defaults in [`apps/server/src/lib/guardrails/config.ts`](../apps/server/src/lib/guardrails/config.ts). Anything you omit inherits the default.

```ts
guardrails: {
  identity: {
    role: "customer support assistant for Acme Europe",
  },
  rules: {
    allowedTopics: ["orders", "shipping", "returns"],
    forbiddenTopics: ["medical advice", "legal advice"],
    forbiddenOutputPatterns: [
      "\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b", // credit card
    ],
    redirects: {
      "cancel subscription": "Please use the self-service portal at eu.acme.com/account.",
    },
  },
  inputGuardrails: {
    rateLimitCount: 10,
    rateLimitWindowSeconds: 60,
  },
}
```

Rate limits, prompt-injection detection, system-prompt leak detection, and content filtering are all enforced per tenant.

## Securing tenants against each other

The middleware guarantees database and config isolation, but a few things are worth doing before running multi-tenant in production:

1. **Set `allowedOrigins` per tenant.** Without it, any website could embed the widget and call that tenant's APIs. With it, Chattr rejects requests whose `Origin` or `Referer` doesn't match.
2. **Keep `CHATTR_ADMIN_KEY` private.** `/api/ingest` is protected by this shared bearer token and affects whichever tenant the header points at. Anyone with the key can ingest into any tenant.
3. **Use unique `dbPath` values.** Two tenants pointing at the same SQLite file share a vector store. The schema won't stop you, but retrieval will leak.
4. **Review `guardrails.inputGuardrails.rateLimitCount`.** Rate limits are per-tenant per-IP, not global. A single abusive IP can still hit each tenant up to the configured cap.

## Operational tips

- **Inspect what's loaded:** `curl http://localhost:3000/api/health` returns the list of active tenants and the resolved default.
- **Test retrieval per tenant:** `pnpm --filter @chattr/server check-retrieval -- --tenant acme-eu --query "shipping" --expect "return policy"`.
- **Per-tenant ops reports:** `pnpm --filter @chattr/server report-chat-ops -- --tenant acme-eu`.
- **Bulk scrape all tenants:** `pnpm --filter @chattr/server scrape-ingest --all`.
- **Tenant configs are typed.** `pnpm typecheck` catches schema mistakes (missing `dbPath`, invalid `scrapeUrl`, unknown `defaultTenantId`) before runtime.
