# Dynamic deployment generations

Date: 2026-09-20

## Goal

Allow frequent releases without disconnecting live Colyseus rooms and without
blocking the next release on a busy two-slot ring. Web-only releases must not
start or replace API processes.

## Architecture

Every API release receives an immutable generation identifier derived from its
Git revision. The routing manifest contains one active generation and zero or
more draining generations. New matchmaking goes only to the active generation;
explicit room-owner routes, joins and reconnects remain available on every
draining generation. A generation owns three API processes and an isolated Redis
instance, exactly as the existing blue/green slots do.

The deploy controller always creates a fresh generation. After health, revision,
admission and Redis-driver checks pass, it atomically publishes that generation
as active, appends all older generations to `draining`, and closes the previous
active generation to new rooms. Cleanup examines every draining generation and
removes only generations whose three processes reproducibly report zero rooms,
zero clients and closed admission. A busy or unverifiable generation remains
routable and does not prevent a later generation from being deployed.

Legacy `blue` and `green` identifiers remain valid during migration. This lets a
new gateway and web client continue routing rooms created by the installed
two-slot controller until both legacy generations drain naturally.

## Independent web releases

The manifest gains `webRevision`. Static routing uses that release rather than
the API generation revision. `deploy-web` builds and extracts only the web image,
copies content-addressed assets, verifies `index.html`, and atomically updates
`webRevision` without touching API containers or admission. A full API deploy
also publishes the web release from the same revision by default.

The browser compares its embedded revision with `webRevision`, while room
creation uses the manifest's active API generation. API protocol changes remain
backward-compatible as required by `docs/API-CONTRACT.md` because old tabs and
draining rooms may overlap multiple server revisions.

## Abandoned rooms

A newly created room gets a bounded waiting-room lifetime. Starting a match
cancels that timer. If the timer expires before a match starts, the room is
disconnected and disposed so a forgotten one-player tab cannot retain a whole
generation forever. Existing reconnection and in-progress match behavior is not
shortened.

The initial timeout is configurable and defaults to 30 minutes in production.
It is disabled for development scenarios and does not replace tournament
scheduler ownership rules.

## Migration and operations

The stable gateway must be upgraded to understand dynamic generation paths before
the first dynamic manifest is published. The migration keeps `blue` and `green`
support. Because replacing the current gateway would disconnect its sockets, the
production migration must either occur in a verified empty-room window or use a
parallel gateway handoff at the outer proxy. Routine deployments after that do
not recreate the gateway.

Status output lists every generation and its process counts. Cleanup is safe to
run repeatedly. Operators should alert on old draining generations and resource
pressure; the controller never kills a live match merely because it is old.

## Verification seams

- deploy controller CLI and generated Compose contract;
- manifest validation with dynamic and legacy generations;
- gateway HTTP/WebSocket routing across multiple draining generations;
- browser manifest parsing, endpoint construction and revision synchronization;
- waiting-room expiration versus started-match preservation;
- live production proof before enabling automatic Dokploy releases.
