FROM node:20-slim AS base
RUN corepack enable pnpm

WORKDIR /app

# Install dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/widget/package.json packages/widget/
COPY apps/server/package.json apps/server/

RUN pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm turbo build

# Production
FROM node:20-slim AS runner
WORKDIR /app

COPY --from=base /app/apps/server/dist ./dist
COPY --from=base /app/apps/server/public ./public
COPY --from=base /app/apps/server/data/seed ./data/seed
COPY --from=base /app/apps/server/scripts/docker-entrypoint.sh /usr/local/bin/chattr-entrypoint
COPY --from=base /app/apps/server/node_modules ./node_modules
COPY --from=base /app/node_modules/.pnpm ./node_modules/.pnpm

RUN chmod +x /usr/local/bin/chattr-entrypoint

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/chattr-entrypoint"]
