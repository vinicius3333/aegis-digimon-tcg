FROM node:26-alpine
WORKDIR /app
COPY tools/deploy/gateway.mjs tools/deploy/shared.mjs ./
ENV PORT=80 AEGIS_ROLLOUT_STATE=/state
EXPOSE 80
USER node
CMD ["node", "gateway.mjs"]
