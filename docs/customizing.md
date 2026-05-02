# Customizing Chattr

Use this guide when you want Chattr to feel like your product instead of the default demo. Most customizations are config-only, and the tables below point you straight to the files that matter.

## Branding and copy

| Goal | File | Notes |
| ---- | ---- | ----- |
| Change the widget's colors, title, subtitle, or avatar | [`apps/server/src/instance/default/chattr.config.ts`](../apps/server/src/instance/default/chattr.config.ts) | Per-tenant `widget.theme`. Overridable per-embed via `data-theme-*` attributes. |
| Change the welcome message or starter questions | Same file, under `widget.welcomeMessage` and `widget.starterQuestions` | Per tenant. |
| Replace the default Chattr logo | [`apps/server/public/Chattr.png`](../apps/server/public/Chattr.png) | Referenced as `/Chattr.png` in the default theme. Swap the file or point `widget.theme.avatarUrl` elsewhere. |
| Change the widget's built-in UI labels (placeholder, "Sources", "Was this useful?", etc.) | [`packages/widget/src/copy.ts`](../packages/widget/src/copy.ts) | Split by language (`en`, `nl`). Add a new language by extending `getWidgetCopy` and `ChatLanguage`. |
| Change default theme fallbacks (bubble size, border radius, fonts) | [`packages/widget/src/theme/defaults.ts`](../packages/widget/src/theme/defaults.ts) | Applied when the tenant and embed don't set an override. |

After editing the widget package, rebuild: `pnpm build`.

## Behavior and intelligence

| Goal | File | Notes |
| ---- | ---- | ----- |
| Change the system prompt | [`apps/server/src/instance/default/chattr.config.ts`](../apps/server/src/instance/default/chattr.config.ts) | Per-tenant `systemPrompt`. Tenant-specific instructions are appended to Chattr's core prompt. |
| Add or change forbidden topics and output patterns | Same file, under `guardrails.rules` | See [`apps/server/src/lib/guardrails/types.ts`](../apps/server/src/lib/guardrails/types.ts) for the full schema. |
| Tune rate limits | Same file, under `guardrails.inputGuardrails` | Per tenant, per IP. `rateLimitCount` / `rateLimitWindowSeconds`. |
| Add or change intent phrases (quick-action detection) | [`apps/server/src/lib/intents.json`](../apps/server/src/lib/intents.json) | Each intent has `tenants`, `phrases`, and `keywords`. Used to surface "Take action" buttons. |
| Swap the default model provider | [`apps/server/.env`](../apps/server/.env.example) | `CHATTR_PROVIDER` and `CHATTR_MODEL`. Re-run `pnpm onboard` for a guided update. |
| Add a new model provider | [`apps/server/src/lib/providers/`](../apps/server/src/lib/providers/) | Add a file following the pattern of `openai.ts` / `anthropic.ts` and register it in `index.ts`. |

## RAG tuning

| Goal | File | Notes |
| ---- | ---- | ----- |
| Change chunk size / overlap | [`apps/server/src/lib/rag/ingest.ts`](../apps/server/src/lib/rag/ingest.ts) | `CHUNK_SIZE`, `CHUNK_OVERLAP`, `MAX_SECTION_SIZE`, `EMBED_BATCH_SIZE` at the top of the file. Re-ingest after changes: `pnpm --filter @chattr/server ingest`. |
| Adjust retrieval scoring | [`apps/server/src/lib/rag/scoring.ts`](../apps/server/src/lib/rag/scoring.ts) | Vector distance, keyword boosts, and the per-tenant retrieval threshold. |
| Validate retrieval changes | CLI | `pnpm --filter @chattr/server check-retrieval -- --tenant default --query "<q>" --expect "<expected source>"`. |
| Change scrape behavior (allowed paths, max pages, depth) | [`apps/server/src/scripts/scrape-job.ts`](../apps/server/src/scripts/scrape-job.ts) | Used by `scrape-ingest`. |

## Infrastructure

| Goal | File | Notes |
| ---- | ---- | ----- |
| Change the HTTP port | `PORT` env var | Defaults to `3000`. |
| Change the default SQLite path | Per-tenant `dbPath` in the instance config | The `CHATTR_DB_PATH` env var is a global fallback only. |
| Enable runtime event logs | `CHATTR_RUNTIME_LOGS=1` | Logs request events as structured JSON lines. See [`apps/server/src/lib/logging.ts`](../apps/server/src/lib/logging.ts). |
| Trust `X-Forwarded-For` behind a reverse proxy | `CHATTR_TRUST_PROXY=1` | Required for accurate rate-limiting behind nginx / Cloudflare / Azure Front Door. |
| Restrict which websites can embed a tenant's widget | Per-tenant `allowedOrigins` | Supports `*.example.com` wildcards. See the [multi-tenant guide](multi-tenant.md#securing-tenants-against-each-other). |
| Skip the Docker first-boot demo seed | `CHATTR_AUTOSEED=0` | Useful when restoring a database into the mounted volume. |

## Extending the chat experience

| Goal | File | Notes |
| ---- | ---- | ----- |
| Change how the assistant formats "Next step" and "Take action" panels | [`apps/server/src/lib/chat-experience.ts`](../apps/server/src/lib/chat-experience.ts) | Builds the structured payload the widget uses to render follow-up buttons. |
| Change widget rendering of streamed responses, sources, or feedback UI | [`packages/widget/src/stream/`](../packages/widget/src/stream/) and [`packages/widget/src/ui/`](../packages/widget/src/ui/) | Each UI piece is in its own file. Shadow DOM isolation means styles live in [`packages/widget/src/styles/`](../packages/widget/src/styles/). |
| Add a new language | [`packages/widget/src/copy.ts`](../packages/widget/src/copy.ts), [`packages/shared/src/language.ts`](../packages/shared/src/language.ts) | Extend `ChatLanguage` and add a branch to `getWidgetCopy`. See the [language guide](language.md). |

## Before you ship

Regardless of what you edited, run the standard checks before shipping:

```bash
pnpm build
pnpm typecheck
pnpm test
```

If you changed anything in the `packages/widget` directory, make sure `apps/server/public/widget.js` picked up the rebuild (the server's build script copies the widget bundle there automatically).
