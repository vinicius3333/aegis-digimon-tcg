# Blue/green production deployment

> Historical/standby path: GitHub Actions image builds are currently disabled.
> Automatic production deploys use Dokploy as described in
> [DOKPLOY-DEPLOYMENT.md](./DOKPLOY-DEPLOYMENT.md). Re-enabling this controller
> requires immutable API/web images again.

## Guarantees

- New matches use the active slot.
- Existing rooms keep their original API process and can join or reconnect.
- A draining slot is never stopped while its room registry is non-empty.
- There is no forced timeout. A third deployment waits for a free slot.
- Rollback revalidates the previous API, database connection, and web container,
  then changes routing and drain state without deleting a live room.
- Images are deployed by immutable digest, not by a mutable tag.
- Production images target the Oracle host's `linux/arm64` architecture.

This protects in-memory Colyseus state. It does not make two API versions wire
compatible automatically: additive schema/protocol changes are safe, while a
breaking protocol change must use a coordinated compatibility release.

## Runtime layout

The stable edge proxy sends `aegis-digi.online` to `aegis-router`. The router
serves `/deployment/manifest.json`, sends `/api/blue/*` and `/api/green/*` to
their named API slots, sends account/auth endpoints to the active API, and
serves the active web image. PostgreSQL remains the shared Dokploy-managed
database and is not recreated by the deploy controller.

Private deployment endpoints are reachable only inside each API container and
require `AEGIS_DEPLOYMENT_ADMIN_TOKEN`. The state file and public manifest live
under `/var/lib/aegis-deploy`; secrets live under `/etc/aegis-deploy`.

## One-time Oracle bootstrap

1. Disable the old Dokploy GitHub deploy webhook. It must never rebuild the
   legacy Compose project after the new controller becomes authoritative.
2. Create `/etc/aegis-deploy/api.env` from `deploy/api.env.example`. Copy the
   existing production database/auth values and generate a long random
   `AEGIS_DEPLOYMENT_ADMIN_TOKEN`. Keep the file mode `0600`.
   Create `/etc/aegis-deploy/controller.env` from
   `deploy/controller.env.example` with the exact legacy API/web container names.
   Ensure Node.js 20 or newer is available in root's non-interactive `PATH`.
3. Upload a repository archive to `/opt/aegis-deploy/releases/<revision>`, point
   `/opt/aegis-deploy/current` at it, and run `sudo deploy/install.sh`.
4. Log in Docker to GHCR if the package is private. The first successful GitHub
   deployment automatically runs the compatibility bootstrap because no state file
   exists. To bootstrap a release manually, run:

   ```bash
   sudo deploy/aegis-deploy bootstrap \
     --revision <git-sha> \
     --api-image ghcr.io/<owner>/<repo>/api@sha256:<digest> \
     --web-image ghcr.io/<owner>/<repo>/web@sha256:<digest> \
     --legacy-api-container <old-api-container> \
     --legacy-web-container <old-web-container>
   ```

5. Verify the canary directly on the Docker network, then change only the edge
   source from the old web container to `aegis-router:80`. Validate the edge
   Caddyfile before reloading it.
6. Enable the reconciler:

   ```bash
   sudo systemctl enable --now aegis-deploy.timer
   ```

During bootstrap, new page loads and new rooms use blue, but existing WebSocket
upgrades still go through the legacy web/API containers. The reconciler counts
established connections on the legacy API's port. Only after zero connections
remain continuously for two minutes does it remove the compatibility route and
stop the two legacy application containers. It never stops PostgreSQL.

After legacy retirement, root-level game and matchmaking routes return HTTP 426.
This deliberately forces an old, idle browser tab to refresh and load the
slot-aware client before it can create a room. Current clients use `/api/<slot>`
and are unaffected.

Every candidate API starts in draining mode. The controller verifies API and web
health, persists the intended cutover, and only then activates the candidate,
publishes routing, and drains the previous slot. Reconciliation reapplies that
persisted state after an interrupted command; it never replaces a running slot
whose room count is non-zero.

## GitHub Actions configuration

Create a protected `production` environment with:

- `ORACLE_HOST`: the VPS hostname or IP.
- `DEPLOY_SSH_KEY`: private key for the restricted deploy user.
- `DEPLOY_SSH_HOST_KEY`: a pinned `known_hosts` line collected out of band.

The corresponding SSH user needs narrowly scoped passwordless `sudo` access to
`/opt/aegis-deploy/current/deploy/receive-release`. The workflow triggers only
after the `Build` workflow succeeds on `master`, and concurrent deployments are
serialized. Remove any legacy deploy webhook before enabling it.

## Operations

Inspect state and both APIs:

```bash
sudo /opt/aegis-deploy/current/deploy/aegis-deploy status
```

Run reconciliation immediately:

```bash
sudo /opt/aegis-deploy/current/deploy/aegis-deploy reconcile
```

Rollback while the previous slot still exists:

```bash
sudo /opt/aegis-deploy/current/deploy/aegis-deploy rollback
```

Rollback is intentionally unavailable after the old slot reaches zero and is
stopped; redeploying an older digest is then the safe forward operation.

Useful logs:

```bash
journalctl -u aegis-deploy.service
docker logs aegis-router
docker logs aegis-api-blue
docker logs aegis-api-green
```

## Verification

Run the unit tests and the real Colyseus continuity smoke test locally:

```bash
pnpm test:tools
pnpm test:blue-green-smoke
```

The smoke test creates a real room on blue, drains blue, verifies that new room
creation is rejected there, creates on green, disconnects a blue client and
reconnects it to the original room.
