# Dokploy production deployment

## Active flow

Dokploy watches the configured Aegis repository's `master` branch through its
push webhook. A push makes Dokploy clone the new revision and build
`docker-compose.dokploy.yml` on the VPS. GitHub Actions is disabled both in the
repository settings and by removing the workflow definitions.

The web image is built with `VITE_AEGIS_DEPLOYMENT_MODE=direct`. It connects to
the same-origin API routes served by the compose web proxy and does not request
the blue/green deployment manifest. The API and web containers expose health
checks, and web startup waits for API health.

## Dokploy service settings

- Source provider: GitHub
- Repository: the canonical Aegis repository configured in Dokploy
- Branch: `master`
- Compose path: `docker-compose.dokploy.yml`
- Auto Deploy: enabled
- Network: existing external `aegis_default`
- Required environment values: `POSTGRES_PASSWORD`, `RESEND_API_KEY`,
  `DISCORD_CLIENT_ID`, and `DISCORD_CLIENT_SECRET`

Dokploy's GitHub integration deploys only when the pushed branch matches its
configured branch. The repository webhook is the observable trigger; its last
delivery should return HTTP 200.

## Operational limitation

This is a single-compose fallback. Building happens on the VPS and updating the
API recreates its process, so active Colyseus rooms can be lost. Do not describe
this path as zero-downtime or blue/green. Before a planned high-traffic rollout,
either announce a maintenance window or restore the immutable-image blue/green
pipeline documented in `BLUE-GREEN-DEPLOYMENT.md`.

After a deployment, verify:

```bash
curl -fsS https://aegis-digi.online/health
curl -fsSI https://aegis-digi.online/
```
