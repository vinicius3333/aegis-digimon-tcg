# Live-room handoff rollout runbook

Status: preparation guidance only. Do not enable live-room handoff in production.

This runbook describes the gates that must be met before a limited rollout can be
considered. The API routes, owner resolver, logical reconnect path, web integration,
and controller promotion hold now exist in the source, but this is not yet a safe,
validated end-to-end operational path. Production remains blocked by the server
experiment gate, and neither a staging pilot nor source cleanup is safe until
the implemented pending-task accounting has real-PostgreSQL and operational proof,
and command-receipt reconciliation is proven across process replacement. Focused
tests do not satisfy those operational gates. See [the contract and implementation status](live-room-handoff-contracts.md)
and [the installed deployment procedure](deployment-room-continuity.md).

## Current production behavior

Keep the existing reconnect and generation-drain path. A routine API deploy
activates the new generation, routes new rooms there, and leaves old generations
running while their rooms drain. Do not stop a busy or unverifiable generation.
The gateway remains stable. For a web-only release, use `deploy-web`.

The current implementation has four separate opt-ins or seams, none of which is
sufficient on its own:

| Gate or seam                                                  | Current behavior                                                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AEGIS_ROOM_HANDOFF_EXPERIMENT=1`                             | Enables the gated handoff coordinator/routes outside production, subject to casual settled-Main or the single explicit pending-mulligan boundary. It does not make other ineligible states migratable. |
| `AEGIS_ROOM_HANDOFF_SERVER=1`                                 | Must also be set; the helper still returns disabled when `NODE_ENV=production`.                                                                            |
| Manifest `capabilities.liveRoomHandoff`                       | Must be explicitly `true` before deploy-controller `handoff-prepare` or `handoff-migrate` will mutate. The normal deploy does not publish this capability. |
| API `/deployment/handoff/*` operations, owner resolver, and logical reconnect | Present and wired in source. API routes require the server/experiment gates and descriptor secret; web owner resolution requires the manifest capability, which also gates controller mutations. Their existence is not proof of operational safety. |

Do not set either API environment flag in production, do not hand-edit the
manifest capability to `true`, and do not invoke handoff actions against a live
deployment. `NODE_ENV=production` currently provides an additional server-side
off switch, not permission to test around the remaining safety gaps.

## Disposable production-like proof

Run `pnpm --filter @aegis/web test:handoff:production-like` from the repository root.
It builds the API, starts an ephemeral PostgreSQL container and two isolated Redis
containers, then starts one real API Node process for each generation. Two real
`colyseus.js` clients join with persisted account tickets, complete the ready,
mulligan, and Breeding-to-Main flow, and retain separate resume credentials. The
test exercises compatibility, signed destination reservation, source checkpoint,
destination validation, and owner claim. A local TCP proxy drops the migrate
response after the source has committed it; green reconciles the PostgreSQL owner
record, blue is killed with `SIGKILL`, green activates, and both participants
resolve and consume fresh seat reservations. Each resumed client is checked
against its own pre-transfer view, including private hand contents.

This is service-level proof, not a full browser or production deployment proof:
API processes run as host child processes rather than API containers, each
generation has one process, clients use the Colyseus SDK directly rather than the
React/mobile UI, and there is no gateway/load balancer or real mobile network
transition. It does not yet prove a lost command receipt across process
replacement, controller restart/duplicate-operation recovery, multi-process
generation routing, or cleanup safety under production load. The harness sets
`NODE_ENV=test` and the two API opt-ins only in its disposable child processes;
the production capability remains off and must not be changed for this test.

## Preconditions before any staging pilot

All of the following must be demonstrated in an isolated staging environment
before a production change is proposed:

1. The authenticated API exposes compatibility, prepare, migrate, progress,
   reconcile, abort, and cleanup-safety operations backed by the durable owner
   store. On reconnect, the client now queries durable status for each saved
   command ID through its authenticated room. The room serves those
   statuses only to the matching account/seat on the current owner epoch; terminal
   receipts compact the local queue, while an explicit `missing` response retries
   that same command ID under the current epoch. Participant order is assigned by
   the durable store, not independently by each tab. Focused API and web
   tests cover this boundary. Prove it in the staging failure exercise below;
   these operations must not return snapshots, reconnect credentials, private
   room codes, or hidden game data in logs or error bodies.
2. The deployment controller is wired to those API operations, publishes the
   capability only for a compatible release, serializes deploys, and pauses after
   the canary in `awaiting_promotion`. Later batches require the explicit
   `handoff-promote` action, providing an operator observation/decision hold. This
   hold does not make a pilot safe while authoritative pending-task accounting
   and cross-process command-receipt behavior remain unproven.
3. Compatibility failures are reported before freeze. The only eligible
   prototype case is a casual two-account room at a settled Main-action
   boundary. Pending decisions, combat, private rooms, bots, ranked play, and
   tournaments remain ineligible until their own continuation and recovery
   proofs pass.
4. Run the focused room/store/client/controller suites, API typecheck, and
   real-PostgreSQL atomicity tests (`POSTGRES_TESTS=1` with a configured test
   database). `pg-mem` and mocked admin ports are useful unit seams, not proof
   of cross-process PostgreSQL locking, gateway routing, or deploy recovery.
   Before any pilot, enforce one deployment-generation identity: `index.ts` gives
   the coordinator `AEGIS_DEPLOYMENT_SLOT`, while room ownership/reconnect code can
   prefer `AEGIS_DEPLOYMENT_GENERATION_ID`. Make them the same source of truth or
   reject mismatches at startup. The production processes inspected on 2026-09-20
   had no override set, but that does not remove the latent mismatch risk.
5. Complete a two-process staging exercise that includes a lost owner-switch
   response, controller restart, duplicate migrate request, stale owner epoch,
   abort before commit, client reload after losing the notice, and a second
   deploy during/after transfer. Prove the result by querying the authoritative
   owner and epoch, not by trusting the caller's last response.
6. The Aegis room handoff port now reads authoritative pending-task counts from
   PostgreSQL: admitted commands and undelivered outbox effects for sessions
   currently owned by the generation, plus in-flight transfers involving it.
   Database errors and invalid totals remain unverifiable and block cleanup. The
   focused store test uses `pg-mem`, while the port test verifies wiring and
   fail-closed propagation with a mocked store; run and pass the real-PostgreSQL
   atomicity/concurrency checks and exercise the cleanup path before any staging
   pilot or source cleanup. The new receipt query has focused mocked-room coverage;
   staging must still prove a lost terminal receipt across process replacement and
   confirm the matching mutation is neither lost nor applied twice.
7. Add production-safe aggregate telemetry and alerting before rollout. The
   controller has an optional aggregate timing callback for tests/injected
   callers, but the deploy CLI does not emit it and the current API has no
   handoff dashboard or SLO. Do not treat test timing as rollout telemetry.

## Staging rollout sequence

After every precondition is met and reviewed, use a dedicated non-production
deployment with no player data. Keep the feature disabled by default and enable
both API flags only on the staging API processes being exercised:

```sh
AEGIS_ROOM_HANDOFF_EXPERIMENT=1
AEGIS_ROOM_HANDOFF_SERVER=1
```

These are configuration values, not commands to run in a production shell. The
staging build must advertise `capabilities.liveRoomHandoff: true` only after the
API and client contract versions agree. If the capability is absent or a
process, API, or database cannot prove its state, stop and use generation drain.

Once the remaining safety proofs and all preconditions above are complete, the
intended controller flow is:

1. Run `handoff-check` with explicit source/destination generations. Save the
   returned `migrationId`; inspect compatibility blockers and readiness. Do not
   prepare incompatible rooms.
2. Run `handoff-prepare` for the same ID. The destination must be healthy,
   non-accepting for new rooms, and have no authoritative rooms before it loads
   an inert candidate. Preparation must not start timers, bots, effects, or
   result delivery.
3. Run `handoff-migrate` with canary count `1`, batch size `1`, and concurrency
   `1`. The required operator hold keeps the remaining rooms untouched while
   the canary's owner epoch, room state, reconnect behavior, and metrics are
   checked. The controller then holds in `awaiting_promotion`; promote only after
   an explicit human decision. This control exists, but the sequence is not safe
   to execute until authoritative pending-task accounting and final command
   receipt reconciliation have passed their cross-process staging proof.
4. Increase batch size and concurrency gradually. The current controller
   accepts batch size up to 500 and concurrency up to 32, but production limits
   must be lower values established by load tests, not these code maxima.
5. After each promotion, inspect aggregate counts and latency: prepared,
   completed, aborted, and unresolved transfers; time frozen; database and
   import duration; reconnect success/failure; deduplicated commands; stale
   epoch rejection; outbox backlog; API CPU/memory; and remaining generations.
   Track pause p50/p95/p99 separately from build time and full deploy duration.
   Pause if the agreed error or latency budget is exceeded.
6. Remove a source generation only when its authoritative owner report verifies
   zero rooms, zero in-flight transfers, and zero pending tasks, and its normal
   per-process status reports admission closed, zero rooms, and zero clients.
   Any missing process or missing count blocks cleanup.

The deploy CLI exposes experimental `handoff-*` actions, the API routes are
wired, and the controller has an explicit canary promotion hold. Nevertheless,
production remains disabled (`NODE_ENV=production` rejects the experiment flag),
and no staging pilot or source cleanup is safe until the pending-task query passes
real-PostgreSQL and operational checks and command-receipt reconciliation is
proven across process replacement. Treat the sequence above as an acceptance
procedure, not a current operator workflow.

## Failure handling and authority boundaries

| Observation                                                                 | Required action                                                                                                                                                                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compatibility check, readiness, or compatibility version is unavailable     | Do not prepare or freeze. Keep the existing owner and use normal generation drain.                                                                                                                  |
| Preparation is incomplete but the owner has not changed                     | Reconcile the persisted transfer first. Abort only if the authoritative store confirms the source still owns the room and every transfer is abortable; then restore source admission and verify it. |
| A migrate response is lost, status is `unknown`, or the controller restarts | Do not retry migration or abort based on local state. Run `handoff-reconcile`, read the authoritative owner/epoch, and continue according to that state.                                            |
| Reconcile proves owner switch committed                                     | Abort and rollback to the old room are forbidden. Recover forward on the current owner; if necessary, perform a new transfer from the latest checkpoint under the new epoch.                        |
| Owner directory/epoch conflicts or database is unavailable                  | Fail closed: do not accept authoritative commands, publish a speculative route, or remove either generation. Preserve both processes and escalate.                                                  |
| Cleanup-safety or any process status is missing/unverifiable                | Leave the source generation running and routed. Resume only after authoritative ownership, transfers, tasks, clients, and room counts can be verified.                                              |
| Any unsupported room or unexpected client behavior                          | Leave that room on its current owner and allow it to finish under the established drain path. Do not force refresh or forfeit it.                                                                   |

Before the ownership commit, abort is compensating work: reconcile first,
confirm no owner switched, cancel prepared destination state, then unfreeze the
source without charging the paused interval to player timers. After commit,
reconciliation is mandatory and recovery is forward-only. A stale source must
remain fenced even if it comes back online. The old deployment image is not a
rollback for already-transferred room state.

## Current operator fallback

For an ordinary release today:

1. Use the installed `deploy` or `deploy-web` command described in
   [deployment continuity](deployment-room-continuity.md).
2. If API readiness or cleanup cannot be verified, do not stop the old
   generation. `status` is read-only; `cleanup` must leave busy or unverifiable
   generations intact.
3. Keep players on the existing reconnect behavior. Do not manually migrate
   room rows, change owner epochs, edit the manifest capability, or remove the
   gateway as a workaround.

Production handoff can be considered only after this document's prerequisites
are executable end to end, the accepted room scope is explicit, and the
canary/metrics/reconcile procedure has been rehearsed against disposable data.
