# Production deployment: the installed Dokploy command

Production runs two isolated slots behind a stable gateway, so a release does not
recreate the serving processes and does not disconnect live matches. The design is
in `docs/plans/2026-09-14-room-preserving-deploy-design.md`; this file records what
is installed on the host.

`docker-compose.prod.yml` must never be deployed with `up --build`: it would start
competing proxies and APIs next to the gateway. Dokploy therefore runs the deploy
controller (`tools/deploy/deploy.mjs`) instead of its default compose command.

## The command

Set as the compose service's custom command in Dokploy. Dokploy prefixes `docker`,
so the stored value starts at `compose`:

```
compose -p aegis-deployer \
  -f /etc/dokploy/compose/aegis-rgise8/code/docker-compose.deployer.yml \
  run --rm --build deployer \
  deploy --source /etc/dokploy/compose/aegis-rgise8/code \
         --env-file /etc/dokploy/compose/aegis-rgise8/code/.env
```

Everything after the service name is passed to `deploy.mjs`.

## Why it builds every time

Dokploy's Docker cleanup (`enableDockerCleanup`) runs `docker system prune --all`,
which removes every image no running container holds. The controller runs with
`--rm`, so its image is never held: a pre-built `aegis-deployer:1` survives only
until the next cleanup.

That is what broke releases between 2026-09-15 and 2026-09-16. Eight consecutive
deployments failed at the first step with:

```
Unable to find image 'aegis-deployer:1' locally
docker: Error response from daemon: pull access denied for aegis-deployer
```

Production stayed on the revision that had been deployed by hand, and every commit
pushed after it silently never reached players.

`compose run --build` rebuilds the image as part of the deployment, so a cleanup
between releases costs a rebuild rather than a failed release. Do not replace it
with a bare `docker run` against a pre-built tag.

## The gateway is separate

`docker-compose.gateway.yml` is installed once and is not part of a release.
Recreating it disconnects live WebSockets.
