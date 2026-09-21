# Production deployment: the installed Dokploy command

Production runs three fixed API slots—blue, red, and green—behind a stable gateway. A release starts in an empty slot, then an atomically replaced manifest routes new rooms to it. The previous slot stops accepting new rooms and remains available for existing rooms, joins, and reconnects until cleanup proves that all three API processes have zero rooms and clients.

Each slot has three API processes and a dedicated Redis service and volume. The stable gateway serves immutable web releases and routes HTTP and WebSocket traffic to the exact process path advertised by Colyseus. Postgres and the outer edge Caddy remain outside routine releases.

## Routine API deploys

Dokploy runs the one-shot deploy controller from tools/deploy/deploy.mjs, not the default production compose command. Never run docker-compose.prod.yml with up --build; that would create competing proxies and APIs beside the gateway.

The controller rotates in this order:

- After blue: red, then green, then blue.
- After red: green, then blue, then red.
- After green: blue, then red, then green.

A slot in active or draining cannot be reused. A leftover unreferenced slot is reused only after admission is closed and all three processes report zero rooms and zero clients. If all fixed slots are active, draining, busy, or unverifiable, deploy stops without replacing any process. Run status and cleanup, then retry when an old slot is proven empty.

Dokploy's custom command starts at compose because Dokploy prefixes docker:

```sh
compose -p aegis-deployer \
  -f /etc/dokploy/compose/aegis-rgise8/code/docker-compose.deployer.yml \
  run --rm --build deployer \
  deploy --source /etc/dokploy/compose/aegis-rgise8/code \
         --env-file /etc/dokploy/compose/aegis-rgise8/code/.env
```

The deployer image must be built with compose run --build. Dokploy's Docker cleanup can remove every unreferenced image between releases, including a prebuilt deployer image.

## Web-only releases

A frontend-only change can use deploy-web. It builds and extracts static files, copies content-addressed assets, checks index.html, then atomically changes webRevision without starting, draining, or removing API services.

```sh
compose -p aegis-deployer \
  -f /etc/dokploy/compose/aegis-rgise8/code/docker-compose.deployer.yml \
  run --rm --build deployer \
  deploy-web --source /etc/dokploy/compose/aegis-rgise8/code \
             --env-file /etc/dokploy/compose/aegis-rgise8/code/.env
```

## Migration from revision-named generations

The controller and gateway continue to read and route existing g-<12 hex> identifiers so those processes can drain. New deploys always choose a fixed blue, red, or green slot. Do not edit the manifest or remove a generation's state directory by hand.

Before the first fixed-slot deploy, run status and inspect the installed manifest and every active or draining process. Confirm that the installed gateway routes both its current g-... identifiers and all three fixed names. The controller publishes a fixed slot as active and retains old g-... owners in draining. cleanup removes a retired generation only when admission is closed and all three processes report zero rooms and clients; unavailable or unverifiable processes block removal. The compatibility code remains until all g-... entries have been cleaned.

Replacing the sole gateway disconnects established WebSockets. Upgrade gateway routing for red during a verified empty-room window, or bring up the compatible gateway alongside the old one and switch the outer proxy before stopping the old gateway. Routine manifest cutovers do not recreate the gateway.

## Status, cleanup, and rollback

deploy status reports the active and draining slots with process status. deploy cleanup checks every draining slot and removes only those proven empty. deploy rollback reactivates the most recent draining slot while retaining the current owner for existing rooms.

The API and web bundles must remain protocol-compatible while active and draining slots overlap. A retained browser bundle checks that its replacement HTML is available before navigating, so a transient gateway error does not replace a working screen.

## Infrastructure boundary

docker-compose.gateway.yml is installed separately and is not part of routine releases. Recreating the gateway disconnects live WebSockets. The first gateway installation or incompatible routing change must use the guarded transition above.
