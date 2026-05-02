# Contributing to Chattr

Thanks for contributing.

## Local Setup

Requirements:

- Node.js 20+
- pnpm 9+

Install dependencies and set up local environment variables:

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/server/.env apps/server/.env.local
```

Then build and run the project:

```bash
pnpm build
pnpm dev
```

Open `http://localhost:3000/demo.html` to test the widget locally.

## Before Opening a PR

Please run:

```bash
pnpm build
pnpm typecheck
```

If your change affects behavior, also update the README or other relevant docs.

## Pull Requests

Please keep pull requests focused and easy to review.

Good PRs usually:

- solve one clear problem
- include a short explanation of the change
- mention any user-facing behavior changes
- include docs updates when setup, configuration, or usage changes

## Issues

When reporting bugs, include:

- what you expected to happen
- what actually happened
- reproduction steps
- local environment details when relevant

For feature requests, describe the use case and why the change would help.
