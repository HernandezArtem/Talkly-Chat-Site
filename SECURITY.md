# Security Policy

## Reporting a vulnerability

Please do not open a public GitHub issue for security problems.

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/Maxkrvo/Chattr/security/advisories/new). Include a description of the issue, steps to reproduce, and the impact you've observed. We aim to acknowledge reports within 72 hours and to publish a fix or mitigation within 30 days for confirmed issues.

## Scope

In scope:

- Authentication and authorization on admin endpoints (`/api/ingest`, `/api/feedback`).
- Cross-tenant data leakage in the RAG vector store or chat responses.
- Prompt-injection bypasses that cause the guardrail pipeline to ignore configured forbidden topics or output patterns.
- System-prompt leakage through crafted user input.
- CORS misconfiguration allowing unauthorized origins to call the chat or ingest APIs.
- Widget script injection or XSS in the embedded widget.

Out of scope:

- Issues that require the operator to intentionally misconfigure Chattr (for example, running with a blank `CHATTR_ADMIN_KEY` exposed to the public internet).
- Rate-limit bypasses that require an already-authenticated admin token.
- Attacks against third-party providers (OpenAI, Anthropic, Azure OpenAI) themselves.
- Denial-of-service that only affects the reporter's own deployment.
- Social engineering, phishing, or physical attacks.

## Safe harbor

If you make a good-faith effort to comply with this policy, we will not pursue legal action and will work with you to resolve the issue promptly.

## Supported versions

Chattr is early-stage open source software. Security fixes are published only against `main`; there are no long-term support branches. Operators are expected to track `main` and redeploy to pick up fixes.
