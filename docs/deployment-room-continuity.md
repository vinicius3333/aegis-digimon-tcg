# Deployments that preserve player rooms

Research date: 2026-09-14. Sources: local application/deployment code, official documentation, and read-only SSH observations supplied by the coordinator. No production deployment or runtime mutation was performed.

## Live Oracle VPS observations

The coordinator inspected the Dokploy deployment at `/etc/dokploy/compose/aegis-rgise8/code/docker-compose.prod.yml`. All three APIs advertise `p1`, `p2`, or `p3`; health responses report slot `legacy`, revision `production`, and accepting new rooms. All three lack the deployment admin token and return 401 for deployment status. Docker StopTimeout is unset and StopSignal is empty, leaving normal Docker defaults. These observations match the local production configuration.

The external `stagecast-edge-edge-1` proxy mounts `/opt/stagecast/infra/Caddyfile.edge` and forwards `aegis-digi.online` to `aegis-web:80`. The web container then routes the process paths to the APIs. Replacing that web container therefore interrupts every API socket traversing it, even if API containers survive.

The host has approximately 22 GiB RAM, with 13 GiB available at inspection. Each API currently used roughly 136–140 MiB against its 1500 MiB limit. Temporary overlap appears plausible from memory observations; CPU is shared with other applications and build resource use still needs a bounded capacity check. These are observations, not a demonstrated production load guarantee.

## Finding

Keep the processes that own existing rooms alive until those rooms are disposed. Run the new release alongside them, send new matches to the new release, and retain exact routes to the previous release for existing sockets, reconnections, and private-room joins. The application already contains much of this drain and blue/green client behavior, but the production Compose and Caddy configuration do not activate it. [Production Compose](../docker-compose.prod.yml), [deployment runtime](../apps/api/src/deployment/runtime.ts), [client router](../apps/web/src/net/client.ts).

## What exists today

| Capability                | Evidence and limitation                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drain new room creation   | Authenticated `POST /deployment/drain` rejects new-room matchmaking with 503 while allowing `join`, `joinById`, and `reconnect`. The actual Colyseus raw HTTP interception is implemented in `DeploymentServer`, beyond Express middleware. [Runtime](../apps/api/src/deployment/runtime.ts), [server seam](../apps/api/src/deployment/DeploymentServer.ts).                                               |
| Drain coordination        | Redis pub/sub broadcasts accepting-new-rooms changes to siblings of the same slot. It is not a persisted desired state or acknowledged barrier; independently inspect each process after draining. [Cluster runtime](../apps/api/src/cluster/runtime.ts).                                                                                                                                                  |
| Room counters             | `/deployment/status` reports `roomRegistry.size` and connected clients for **the receiving process only**. A load-balanced response with zero rooms is insufficient to stop a three-process slot. Poll all owning processes directly. [API setup](../apps/api/src/index.ts).                                                                                                                               |
| Reconnection              | The server holds a dropped seat for 180 seconds and resends current state and open prompts. The browser stores token, room ID, and owning slot in per-tab session storage. This resumes the live process; it cannot restore a restarted process. [Room lifecycle](../apps/api/src/rooms/AegisRoom.ts), [session storage](../apps/web/src/net/reconnectSession.ts), [hook](../apps/web/src/net/useRoom.ts). |
| Blue/green routing        | The browser understands `/deployment/manifest.json`, `/api/blue`, `/api/green`, active and draining revisions, joins compatible waiting rooms on draining slots, and reconnects to the remembered owning slot. Private codes are searched across both slots. [Manifest](../apps/web/src/net/deployment.ts), [router](../apps/web/src/net/client.ts).                                                       |
| Current production wiring | Compose defaults the web to `direct`, omits deployment admin token and slot, and runs three APIs with `/p1`, `/p2`, `/p3` public addresses. Caddy only knows these current-process routes; there is no manifest or slot route. [Compose](../docker-compose.prod.yml), [Caddy](../docker/Caddyfile).                                                                                                        |
| Restart protection        | Production refuses SIGTERM/SIGINT when local rooms remain. Docker still sends SIGKILL after its stop timeout, so this guard does not make `compose up` recreation safe. [Shutdown handler](../apps/api/src/index.ts), [Docker stop documentation](https://docs.docker.com/reference/cli/docker/container/stop/).                                                                                           |

## Important implementation gaps

1. **Matchmaking isolation is incomplete if both slots use the same Redis.** `readClusterConfig` computes `aegis:<slot>:` but `createClusterRuntime` passes only the Redis URL to `RedisDriver` and `RedisPresence`. The prefix is used for room-code keys and the drain topic, not the driver. The locally installed `@colyseus/redis-driver` 0.16.1 implementation uses the fixed `roomcaches` key. Separate Redis instances per slot are the straightforward isolation boundary; an alternative requires explicitly implementing and verifying driver and presence namespaces. [Config](../apps/api/src/cluster/config.ts), [construction](../apps/api/src/cluster/runtime.ts), local dependency `node_modules/.pnpm/@colyseus+redis-driver@0.16.1_@colyseus+schema@3.0.76_@pm2+io@6.1.0/node_modules/@colyseus/redis-driver/build/RedisDriver.js`.

2. **The web container is also the WebSocket proxy.** Replacing that container closes its existing tunnels even if APIs stay alive. API traffic should traverse a stable proxy whose lifecycle is independent of static-web releases, or the previous web/proxy container and its routes must remain reachable. [Web/Caddy routes](../docker/Caddyfile), [Compose web service](../docker-compose.prod.yml).

3. **Caddy reload is not socket-neutral by default.** Its official documentation states that config reload closes WebSockets. `stream_close_delay` postpones closure but is a finite grace period, not an unlimited continuity guarantee. Prefer stable API routing that does not change on each deployment; where reload is unavoidable, configure retention covering the supported drain period and prove it with an established socket. Adding this option to a new configuration does not prove retention for streams owned by the old configuration that lacked it. The initial migration should use an empty-room window unless old-stream retention has been independently demonstrated. Do not confuse a health check or retry with room failover. [Official Caddy streaming documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#streaming).

4. **Room disposal can lag game completion.** The game-over handler locks the room and records the result, whereas the registry entry is deleted on `onDispose`. Counting room registry entries conservatively preserves connected postgame players, but can defer slot reuse indefinitely when players stay connected. A bounded, explicit postgame lifecycle would need its own product decision. [Game-over and disposal handlers](../apps/api/src/rooms/AegisRoom.ts).

5. **In-progress matches are not durable.** The engine, seat maps, bot drivers, decision requests, and timers belong to the room in process memory. Database result recording and Redis matchmaking metadata are not a recoverable full engine checkpoint. True recovery after crashes would require versioned complete checkpoints or deterministic event replay, including RNG, pending resolutions and prompts, deadlines, credentials, ownership fencing, and tests. Keeping old processes alive is the smaller deployment solution. [Room state and engine construction](../apps/api/src/rooms/AegisRoom.ts), [engine](../apps/api/src/engine/GameEngine.ts).

## Recommended rollout protocol

1. Prepare immutable release images outside the request-serving processes. Keep Postgres and active-slot Redis unchanged; use database migrations compatible with both releases during overlap.
2. Start the idle slot with explicit revision, admin token, slot name, isolated Redis, and unique owner addresses such as `/api/green/p1`, `/api/green/p2`, `/api/green/p3`. Route these paths exactly to their owner; confirm the Colyseus advertised address and prefix stripping agree.
3. Check `/ready` and the revision on every new process. The present readiness endpoint checks the account database, so also prove matchmaking and an actual WebSocket connection before switching traffic. [Readiness](../apps/api/src/deployment/runtime.ts).
4. Publish matching static web assets and an atomically updated, uncached manifest pointing to the new active revision and the previous draining revision. Keep old assets available for retained tabs and reconnections. Preserve the legacy direct routes during the first migration so already open legacy tabs still reach their original owners.
5. Drain the previous slot and verify `acceptingNewRooms=false` on **each** process. Retain its API routes, Redis, proxy tunnels, reconnect routes and room-code access. Confirm new-room creation targets the active slot and joins/reconnections to the draining slot still work.
6. Wait for `activeRooms=0` on all retiring processes. On a bounded wait expiring, leave the old slot running and mark cleanup pending; do not kill it. With only two slot names, do not reuse the draining name until its original room owners are gone. A third simultaneous revision needs additional revision-addressable infrastructure.
7. Stop only those proven-empty old APIs and their now-unused isolated Redis. Keep old web assets through the chosen cache/reconnect retention period. Roll back by reactivating the previous slot and restoring the manifest, while preserving any rooms already created on the new slot.

This is a proposed operational protocol, not a tested live rollout. Required proof before enabling it: simultaneous releases, existing player sockets across cutover, mobile disconnect/reconnect to the old owner, private-code lookup on a draining slot, waiting-room join, new-match isolation, and cleanup refusal while any owner still has rooms.

## Immediate lower-complexity alternative

Before blue/green infrastructure exists, drain the current deployment, confirm all three processes have stopped accepting new rooms, wait for all local room counters to reach zero, then recreate it. Existing games can finish, but new room creation is unavailable during the wait and restart. Merely restarting one of the three APIs at a time loses the rooms owned by that API; load balancing does not transfer them. The current production configuration needs a deployment token to expose the authorized drain operation. Adding that environment variable by recreating existing APIs already destroys their rooms, so it cannot safely bootstrap draining while games are active. Use an independently verified empty-room window for the initial migration, or design an external admission gate that blocks new room creation while preserving legacy joins, reconnects and live streams without reloading their current proxy configuration. [Runtime](../apps/api/src/deployment/runtime.ts), [Compose](../docker-compose.prod.yml), [owner routing](../docker/Caddyfile).

## Deployment operations

The implementation in `tools/deploy/` replaces application recreation with a stable gateway and isolated blue/green API stacks. `docker-compose.gateway.yml` installs the serving gateway once; application releases never run `up --build` against the legacy production stack. The existing Postgres container and volume remain independent of slot cleanup. Both gateway and API admission read the same atomically replaced manifest directory; retired APIs cannot create HTTP or internal tournament rooms after restart. Existing bot rooms remain owned by their original process.

The Oracle state directory is `/opt/aegis-rollout`. Its `routing/manifest.json` is public routing metadata, `slots/<slot>/compose.json` and `admin-token` are private operator files, and `releases/` plus `assets/` retain immutable web files. The gateway mounts state read-only and has no Docker socket. The one-shot deployer mounts the Docker socket and uses **host-identical paths** for state and source.

Routine operations:

```sh
# Inspect every process in the active and retiring slots.
ssh oracle-vps 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v /opt/aegis-rollout:/opt/aegis-rollout aegis-deployer:1 status'

# Remove a retiring slot only when all three owners are drained and empty.
ssh oracle-vps 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v /opt/aegis-rollout:/opt/aegis-rollout aegis-deployer:1 cleanup'

# Revert routing while an earlier slot is still retained; keep both versions rooms.
ssh oracle-vps 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v /opt/aegis-rollout:/opt/aegis-rollout aegis-deployer:1 rollback'
```

Dokploy's custom command (the platform prefixes `docker` itself) is:

```text
run --rm -v /var/run/docker.sock:/var/run/docker.sock -v /etc/dokploy:/etc/dokploy:ro -v /opt/aegis-rollout:/opt/aegis-rollout aegis-deployer:1 deploy --source /etc/dokploy/compose/aegis-rgise8/code --env-file /etc/dokploy/compose/aegis-rgise8/code/.env
```

The deployer builds immutable API/web images serially, checks each new process and Redis-backed matchmaking, then atomically changes the active slot. If the old slot is busy, cleanup remains pending and its processes keep serving players. A subsequent release cannot reuse that slot until all owners are empty; no timeout forces their removal. A same-revision deployment is a no-op. Rollback is available while the earlier slot remains running; after automatic empty-slot cleanup, redeploy the earlier source revision instead.

Do not use Dokploy **Stop/Delete**, `docker compose down` on an active slot, or recreate the gateway/edge during games: these operations bypass the controller. Infrastructure upgrades require a separate empty-room window. A failed controller leaves a lock only if its process was killed; inspect running deployer containers and slot status before manually removing `/opt/aegis-rollout/deploy.lock`.

Verification commands are `pnpm test:deploy`, the focused API deployment/room/tournament-gateway suites, and the existing web deployment/router suites. Live validation must additionally exercise real Colyseus reservations and WebSockets through the gateway across a cutover before enabling the production deployment pipeline. [Controller](../tools/deploy/deploy.mjs), [gateway](../tools/deploy/gateway.mjs), [persistent admission](../apps/api/src/deployment/admission.ts), [Dokploy custom-command behavior](https://docs.dokploy.com/docs/core/features).
