FROM docker:cli AS docker_cli
FROM node:22-alpine
RUN apk add --no-cache git
COPY --from=docker_cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker_cli /usr/local/libexec/docker/cli-plugins /usr/local/libexec/docker/cli-plugins
WORKDIR /app
COPY tools/deploy/deploy.mjs tools/deploy/shared.mjs tools/deploy/handoff-controller.mjs ./
ENTRYPOINT ["node", "/app/deploy.mjs"]
