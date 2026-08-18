FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

ARG VITE_AEGIS_API_URL=wss://aegis-digi.online
ARG VITE_AEGIS_REVISION=development
ARG VITE_AEGIS_DEPLOYMENT_MODE=slots
ENV VITE_AEGIS_API_URL=$VITE_AEGIS_API_URL
ENV VITE_AEGIS_REVISION=$VITE_AEGIS_REVISION
ENV VITE_AEGIS_DEPLOYMENT_MODE=$VITE_AEGIS_DEPLOYMENT_MODE

RUN pnpm --filter @aegis/shared build && pnpm --filter @aegis/web build

FROM caddy:alpine
COPY --from=builder /app/apps/web/dist /usr/share/caddy
COPY docker/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
