# Account replays on the existing VPS

## Approved behavior

The user approved ten saved replays per account and using the existing Oracle VPS as S3-compatible storage. Saving is manual from a completed match's result. At ten occupied slots the UI asks the player to delete a saved replay; it never silently replaces favorites. Downloads remain available independently of account storage. Account saves have a 2 MiB compressed-file limit, while local downloads/imports retain the existing 32 MiB expanded-file limit. Total reserved account storage is capped at 20,000,000,000 bytes.

The follow-up UI request makes the recorded board fill the viewport with floating controls, collapsible playback options, and an optional action-history panel. Narrow layouts position controls above the player's hand; users can hide controls entirely. The site navigation returns when playback closes. A second follow-up authorizes showing both recorded hands after a game ends. New participant exports include seats 0 and 1; existing own-hand-only files still open. No extra hidden state is transmitted during live games. Hidden pile order, private prompts and session credentials remain redacted.

## Data flow and ownership

The completed authoritative room receives `replaySave` without accepting file bytes, a match ID or an account ID from the client. It resolves the existing authenticated participant, generates/reuses that seat's gzip export, and saves it. Guests, spectators and unfinished games cannot save. Casual/private series carry the original trusted account ID through the server-owned continuation record so games two and three work too. Reconnects retain the existing account mapping.

`account_replays` stores ownership, one slot from 1 through 10, summary metadata, perspective, byte count, SHA-256 checksum, timestamp and operation status. A unique account/slot constraint and account row locks enforce the limit across API replicas; duplicate match/perspective saves reuse their reservation. A singleton byte counter atomically enforces the global cap across different accounts. The gzip bytes are stored in S3 under `accounts/<account-id>/<replay-id>.aegis-replay`, without base64 expansion.

Cookie-authenticated `/account/replays` endpoints list, download or delete only the caller's records. Downloads proxy through the API with `private, no-store`; the browser gets neither S3 credentials nor an unrestricted object URL. Playback uses the existing validated local-file parser.

## Failure recovery

Reserve `pending` metadata and disk quota before PUT. Mark a successful write `ready`; a crash or uncertain S3 response leaves a known key and a reservation which can be retried or removed. A repeated save does not consume a second slot. Reading checks both byte count and checksum.

Deletion commits a `deleting` tombstone first and releases quota only after S3 removal. Concurrent cleanup workers cannot decrement quota twice. Each API's bounded maintenance pass retries up to twenty tombstones or pending writes older than 24 hours; completed replays do not expire. Interrupted entries stay visible with a delete action. The S3 adapter bounds response streams and network timeouts, and saves coalesce concurrent requests from the same socket.

## Private VPS service and deployments

Use [Garage](https://garagehq.deuxfleurs.fr/documentation/quick-start/) v2.4.1, pinned to image digest `sha256:9c96caa2612d3411acc5b0e6701fb238dbfba33e533a6d7d3d811a4b12d0d020`. A standalone Compose stack keeps data, metadata and snapshots under `/opt/aegis-replays`, independently of app releases. S3 is reachable only on the existing private `aegis_default` Docker network at `aegis-replay-s3:3900`; no host ports, public website endpoint or admin endpoint are exposed. The service uses at most 512 MiB RAM and 0.5 CPU, fsyncs data, and caps its bucket at 20 GB and 100,000 objects.

`tools/storage/install-vps-replays.sh` generates credentials once, refuses conflicting existing configuration, starts only the storage service, and atomically installs root-only `/opt/aegis-rollout/replay-storage.json` after readiness and quota configuration. The deployment controller reads this optional file into every new API generation. Deployments without it remain supported. Existing APIs and the stable gateway are not recreated by storage installation.

A single VPS has one copy of the data. Local metadata snapshots do not provide an off-host backup. Back up the Garage data/metadata and corresponding Postgres records to a separate destination if recovery after disk or host loss is required. External backup has not been provisioned in this task.

## Validation and installed state

On 2026-10-08 the private storage stack was installed on the authorized VPS; the existing app/gateway/database containers were retained. Application changes remain on `replay-files` for review, pending application release.

- Real Garage S3 and a separate temporary Postgres 16 instance: four tests exercise fourteen simultaneous saves across library instances (exactly ten accepted), concurrent duplicate saves, cross-account ownership, global-cap contention, binary roundtrip integrity and concurrent deletion recovery. Tests use isolated schemas and remove their S3 objects.
- Twenty selected backend tests cover account ownership, ten-slot enforcement, crash recovery, stale uploads, checksum failures, authoritative exports, live/guest/spectator rejection, series identity and existing series behavior.
- Thirteen browser cases cover local import, live-match download, five viewport sizes, playback timing, seek/animation correctness, saved-library opening/deletion, full-viewport bounds, collapsible history/controls and inspecting both hands on mobile with controls clear of the player's cards.
- Twelve selected client tests and twenty-eight deployment-controller tests passed. Shared builds, API/web type checks and both production builds passed. Targeted lint reports three existing shadowing warnings in `useRoom.ts` and `tools/deploy/deploy.mjs`; formatting and whitespace checks passed. The local runtime was Node 24.21.0, which warns against the repository's Node 26 engine requirement.
- The temporary Postgres validation container, SSH tunnels and local credential copy were removed after validation. Garage remains healthy with no published ports; an unsigned S3 request returns HTTP 403. The local preview API was restored to its usual development configuration.

The downloadable example `apps/web/public/replays/demo.aegis-replay` is a complete authoritative bot-driven local match (Agumon Player vs Gabumon Player), 36,358 compressed bytes, 155 frames and 11 turns, with both recorded hands. It contains test players rather than real user identities. Earlier storage-average samples represented own-hand-only files; they must not be presented as the production average of the new two-hand exports.
