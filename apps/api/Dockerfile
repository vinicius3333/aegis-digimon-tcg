FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY data/kb/banlist.json ./data/kb/banlist.json

RUN pnpm --filter @aegis/shared build && pnpm --filter @aegis/api build

ENV PORT=2567
EXPOSE 2567
CMD ["node", "apps/api/dist/index.js"]
