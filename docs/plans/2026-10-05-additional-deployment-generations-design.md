# Additional deployment generations

## Problem and agreed behavior

Long-lived rooms can occupy all three fixed slots and prevent releases. Deploy a new isolated generation when no fixed slot is available, preserving existing matches and their owning processes. The user approved this approach on 2026-10-05.

## Design

Prefer blue, red, and green. First reclaim draining and orphan deployments only when their running processes prove that admission is closed and room/client counts are zero. When all fixed slots remain occupied, allocate an unused `g-<12 hex>` identifier. The installed gateway, API runtime, and browser already support these identifiers.

Each generation uses the existing three API containers and a dedicated Redis service. Build and verify the new revision, then atomically publish its manifest entry and stop admission on the previous active generation. Existing sockets and reconnections retain their exact owner routes. Keep rollback and verified-empty cleanup unchanged. Repeating the active revision does not create more containers.

Require at least 6932 MiB of host available memory before building an additional generation and immediately before starting its services. This covers the new services' full memory limits and 2 GiB of build/host headroom. Mount host meminfo read-only; fail closed if capacity cannot be verified. Additional generations are reclaimed by cleanup and subsequent deploys, with no forced room termination.

## Validation

Exercise the real controller CLI with all fixed slots owning rooms; verify isolated process paths and Redis, retained old manifests/services, and revision idempotence. Reject insufficient or malformed memory before any build or start. Preserve the existing real WebSocket cutover/reconnection test, orphan cleanup tests, and rollback behavior.

Publish through a regular merge PR, deploy via the existing Dokploy controller, then verify public revision, health, and old-owner retention on the Oracle VPS. Do not restart the stable gateway.
