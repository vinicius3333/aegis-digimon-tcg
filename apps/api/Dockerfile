FROM node:26-bookworm-slim AS build
RUN npm install --global pnpm@10.30.1
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY patches ./patches
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY data/kb/banlist.json ./data/kb/banlist.json

RUN GOMEMLIMIT=768MiB GOMAXPROCS=1 pnpm --filter @aegis/shared build \
    && GOMEMLIMIT=768MiB GOMAXPROCS=1 pnpm --filter @aegis/api build

FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install --no-install-recommends -y libatomic1 libgomp1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
RUN python -m pip install --no-cache-dir torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu \
    && python -m pip install --no-cache-dir numpy==2.2.6 click==8.1.8
WORKDIR /app
COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build /app /app
COPY tools/bot-training/inference.py tools/bot-training/features.py tools/bot-training/model.py \
    tools/bot-training/migrate.py tools/bot-training/bridge.py ./tools/bot-training/

ENV AEGIS_BOT_PYTHON=python3 PYTHONDONTWRITEBYTECODE=1
ENV PORT=2567
EXPOSE 2567
CMD ["node", "apps/api/dist/index.js"]
