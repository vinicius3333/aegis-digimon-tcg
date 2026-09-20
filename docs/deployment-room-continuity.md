# Production deployment: the installed Dokploy command

Production runs immutable API generations behind a stable gateway, so a release
does not recreate room-owning processes and does not disconnect live matches. One
generation is active and any number of older generations may drain concurrently.
The original two-slot design is in
`docs/plans/2026-09-14-room-preserving-deploy-design.md`; its dynamic successor is
in `docs/plans/2026-09-20-dynamic-deployment-generations-design.md`. This file
records what is installed on the host.

## Live-room handoff is not enabled

The repository contains a narrow room/checkpoint experiment, API
`/deployment/handoff/*` control routes, player-facing owner resolution and
logical reconnect support, plus deployment-controller test seams. These are not
currently production-enableable: the server experiment gate explicitly rejects
`AEGIS_ROOM_HANDOFF_EXPERIMENT=1` when `NODE_ENV=production`, and the server,
descriptor-secret, and deployment-manifest capability gates must also agree.
The web client follows the owner-resolution path only when
`capabilities.liveRoomHandoff` is advertised; normal deploys do not advertise it.
Do not set the handoff flags or capability on the production host. If an old
generation still owns a room, leave it running until the existing status/cleanup
checks prove it empty. See the [handoff rollout runbook](live-room-handoff-runbook.md)
for prerequisites, canary gates, and recovery boundaries.

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

The full command builds both API and web artifacts. It creates a generation named
from the Git revision (`g-<12 hex>`), atomically makes it active, and leaves every
older generation with rooms in `draining`.

## Web-only releases

A frontend-only change does not need an API generation. Use the same installed
controller with the `deploy-web` action:

```
compose -p aegis-deployer \
  -f /etc/dokploy/compose/aegis-rgise8/code/docker-compose.deployer.yml \
  run --rm --build deployer \
  deploy-web --source /etc/dokploy/compose/aegis-rgise8/code \
             --env-file /etc/dokploy/compose/aegis-rgise8/code/.env
```

This builds and publishes `webRevision` atomically. It does not build, start,
drain, activate, or remove any API process.

## Dynamic-generation migration

The installed gateway that only recognizes `/api/blue` and `/api/green` must be
upgraded before the first dynamic deployment. The new gateway remains compatible
with those legacy identifiers, allowing their rooms to drain normally. Do not
publish a `g-…` active generation while the old gateway is serving traffic.

Replacing the sole gateway disconnects its established WebSockets. Perform the
one-time upgrade either in a verified empty-room window or by bringing up the new
gateway alongside the old one and removing the old gateway from the outer proxy
before stopping it. Routine releases never recreate the gateway.

`deploy.mjs status` reports all active and draining generations. `cleanup` removes
only a generation whose three processes all report closed admission, zero rooms,
and zero clients. Busy or unverifiable generations remain running and routable.

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

`docker-compose.gateway.yml` is installed separately and is not part of a routine release.
Recreating it disconnects live WebSockets.
