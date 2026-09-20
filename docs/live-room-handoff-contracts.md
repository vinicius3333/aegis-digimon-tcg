# Live room handoff contracts

Status: partial experimental foundations exist; end-to-end handoff is not production-ready or enabled.
Scope: migrate a running game between API processes while preserving gameplay, player identity,
private information boundaries, and exactly-once effects.

This document separates implemented foundations from the target contracts that remain. The current
source remains authoritative for existing behavior; proposed wire/storage shapes below are not all
implemented. See [Aegis architecture](ARCHITECTURE.md), [Aegis API contract](API-CONTRACT.md), and
the [live-room handoff rollout runbook](live-room-handoff-runbook.md).

## Current ownership and gaps

`AegisRoom` owns a `GameState`, one `GameEngine`, transport/session maps, event sequencing,
presentation replay fields, timers, bot drivers, and tournament bindings. `GameEngine` owns the
rules runtime and several mutable ledgers. `GameState` is the Colyseus synchronized model, not a
complete checkpoint. In the ordinary production path there is no durable canonical game identity,
owner-epoch directory, intent admission/deduplication log, or serializable engine continuation.
The gated prototype adds durable records and room fences for eligible sessions, but it is not yet
the lookup/control plane used by clients or normal deployment.

The room's `roomId` remains a physical Colyseus identifier and is still an idempotency or binding
key for existing ranked records and tournament room claims. In the opt-in experiment,
`AegisRoom` creates a logical session from `matchLogId` and copies that value to `GameState.matchId`
after both stable participants are known. That prototype identity does not migrate existing
persistence keys or provide a public owner lookup. A complete handoff still needs a stable identity
integrated with ranked/tournament records; changing only the Colyseus room ID would break existing
result and tournament ownership checks.

## Implemented foundation and current limits

The repository now contains experimental pieces, not a usable production migration path:

- Migration `016-room-handoff-persistence` and `RoomHandoffStore` define durable logical sessions,
  owner epochs, checkpoints, command admission/deduplication, transfers, and an outbox. Store tests
  use `pg-mem`; the opt-in real-PostgreSQL atomicity suite is separate and must be run against a
  configured database before relying on transactional behavior in production.
- `AegisRoom` can register logical session identity, check its durable owner epoch, freeze, save a
  narrowly scoped checkpoint, restore an inert destination, and fence/dispose an old owner. The
  snapshot proof only accepts a settled Main-action boundary with both seats present and no pending
  decision or combat window. Prepared rooms reject private, bot, ranked, and tournament modes.
- These room hooks require both `AEGIS_ROOM_HANDOFF_SERVER=1` and
  `AEGIS_ROOM_HANDOFF_EXPERIMENT=1`; they remain disabled whenever `NODE_ENV=production`.
- The web package contains a current-owner resolver and a reload-safe per-tab command-queue
  abstraction, but `useRoom` does not use them and there is no server owner-resolution endpoint.
- `tools/deploy` has an injected-port controller and local transfer journal for compatibility,
  prepare, migration, progress, abort, and reconciliation tests. The API does not implement the
  corresponding `/deployment/handoff/*` endpoints, and the deploy script does not publish the
  `liveRoomHandoff` manifest capability. Its prepare/migrate actions therefore remain gated off;
  `handoff-check` also cannot complete against the current API.

No supported end-to-end transfer coordinator currently connects the database, room hooks, web
client, deployment controller, and gateway. The prototype does not resume open choices, combat,
private rooms, bots, ranked games, or tournaments. Normal reconnection and generation draining
remain the supported production behavior. See the runbook before changing any handoff flag.

## State coverage matrix

“Persist” means it must be present in a durable final checkpoint or an equally durable record
before an owner change. “Derive” means it has one authoritative source and must be recomputed from
that source after import. “Reconstruct” means it is a process-local service or connection that is
recreated from persisted data. These categories describe the target handoff contract, not the
current implementation.

| State group                                                                           | Current owner / evidence                                                                                                                                                                                          | Handoff treatment                                                                                                                      | Notes and blockers                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card instances, all zones and order, card/art/instance IDs, ownership, face-up status | `GameState.players`; `PlayerState`, `Permanent`, `CardInstance`; engine zone-access layer                                                                                                                         | Persist                                                                                                                                | Includes deck, egg deck, hand, security, trash, delay, resolving Option, breeding, battle area, permanent stacks and linked cards. Snapshot is server-only because it contains every hidden identity and order.                                                                                            |
| Turn and rules cursor                                                                 | `GameState`: phase, turn count/seat, memory, first-turn flag, game-over and winner; per-instance flags in `Permanent`                                                                                             | Persist                                                                                                                                | These affect legality and future rules. Do not reconstruct from events alone.                                                                                                                                                                                                                              |
| Match mode and seat identity                                                          | Room booleans/maps; account and tournament claim data; seat fields on state                                                                                                                                       | Persist stable values; reconstruct live client bindings                                                                                | Keep logical game ID, mode, seat/account/participant IDs and frozen deck/art snapshots. Never persist a Colyseus `sessionId` as participant identity. Reauthenticate reconnect credentials and bind a new session to the same seat.                                                                        |
| Room-private code, room registry and transport routing                                | `AegisRoom.roomCode`, `roomCodes`, `roomRegistry`, Colyseus                                                                                                                                                       | Reconstruct                                                                                                                            | A room code is a capability and must be transferred only through protected storage/authorized lookup; the registry and sockets are process-local. Do not expose it in a public snapshot.                                                                                                                   |
| Event and batch cursors                                                               | `eventSeq`, `batchSeq`, `currentBatch`, `batchDepth`; `GameState.stateVersion`                                                                                                                                    | Persist committed high-water marks; reconstruct an empty batch                                                                         | A transfer may not reuse event IDs or revision numbers. A snapshot may only be cut at a closed batch boundary; no open batch may be serialized. Presentation events are not the source of game truth.                                                                                                      |
| Pending effect decision                                                               | `GameState.pendingDecision` plus `DecisionManager.open`                                                                                                                                                           | Persist a stable prompt descriptor and execution frame; reconstruct manager, timer and transport delivery                              | `pendingDecision` is only a partial mirror. `DecisionManager.open` includes a Promise resolver, validation metadata and timer; those are not serializable. Preserve decision ID, seat, kind, constraints, candidates, private visible identities, frame/program location and response status.              |
| Mulligan / setup wait                                                                 | `MulliganCoordinator.open`, `GameState.pendingDecision`, `rngForSeat`                                                                                                                                             | Persist setup frame, mulligan descriptor and RNG; reconstruct coordinator and transport                                                | `mulligan` has a separate resolver and no timeout. Preserve whether each seat has already used its one redraw and exact deck order/PRNG stream.                                                                                                                                                            |
| Main and Breeding phase waits                                                         | `MainPhaseController.end/activeSeat`; `BreedingPhaseController.end/activeSeat/actionSpent`; `TurnStateMachine.running`                                                                                            | Persist phase continuation frames; reconstruct Promise drivers                                                                         | A phase may be open while no player action is running. The corresponding `resolve` callback cannot be copied. Include accepted action progress and whether a Breeding action's triggers are still settling.                                                                                                |
| Combat execution                                                                      | `CombatController`: current attack/target, attack sequence, open block/counter/alliance/evade/barrier windows, battle stack, guards, completed combat; schema `combatWindow` mirrors only prompt display/legality | Persist combat frames and stable prompt descriptor; reconstruct controller and pending waits                                           | `combatWindow` alone is insufficient to resume `resolveAttack`; preserve attack step and nested battle/trigger position. Do not reopen a prompt already answered or replay the reveal/check.                                                                                                               |
| Trigger/effect execution                                                              | `GameEngine` pending timing windows, collected effects, trigger pools, deferred queues and resolution-depth guards; `CollectedEffect` and `EffectContext` may contain callbacks/references                        | Persist stable effect/frame descriptors and ordered queues; reconstruct contexts from IDs                                              | No arbitrary function, closure, Promise, `WeakMap`, object pointer, or interpreter stack frame may appear in a snapshot. Static frames need stable card/effect/program IDs and instruction positions. Unsupported/legacy continuations must block transfer before freeze.                                  |
| Duration modifiers, continuous effects and subscriptions                              | `ModifierLedger`, `ContinuousEffectLedger`, `SubTriggerRegistry`, counters and registries in `GameEngine`                                                                                                         | Persist one-shot/timed effect descriptors and remaining duration; derive persistent continuous effects from board and card definitions | Do not serialize implementation objects. Stable IDs, source/anchor identity, controller, event filters, captured contexts that affect future behavior, use counts, expiry boundary, resolution order and consumption must be represented. Recomputing persistent effects must not rerun one-shot bodies.   |
| Per-turn/per-window usage and rule-process state                                      | `UseTracker`, `GameEngine` sets/maps, `CombatController.attackedThisTurn`, window/battle counters, pending costs and rule trigger pools                                                                           | Persist when it changes future legality/order; clear only at documented rules boundaries                                               | Includes max-per-turn use, accepted/resolved Blitz, Rush crossing, attack eligibility, `justLinked`, pending reducer placements/relocations, play-cost deletion pool and nested trigger identities. Re-derive only from a complete explicit source, never guess from the visible board.                    |
| Derived board projections                                                             | public counts, `securityView`, hand affordances, legal target/cost projections, keywords and continuous stat projections in shared schema                                                                         | Derive after import                                                                                                                    | Rebuild and validate before destination is activated. Preserve underlying authoritative modifiers/overrides that the projections depend on. Rebuilding views must respect the same per-seat visibility tags.                                                                                               |
| Bots                                                                                  | `AegisRoom.bots`; `BotPlayer` has profile/policy, private PRNG closure, running/resume flags, turn markers and narration deadline                                                                                 | Persist driver/profile/version and RNG state, or define and prove deterministic reconstruction; reconstruct driver                     | A destination must remain inert before ownership transfer. Do not let a bot act twice due to source and destination callbacks. In-flight think/narration delays are presentation-only and may be canceled or resumed by remaining duration.                                                                |
| Room, decision, combat and reconnect timers                                           | `waitingRoomTimeout`, `readyTimeout`, decision `setTimeout`, combat timeout and Colyseus `allowReconnection`                                                                                                      | Persist deadline/remaining time and policy; reconstruct timers                                                                         | Capture paused remaining time at freeze. Handoff downtime must not count against a player's decision/combat grace. Existing offline duration must not be reset by repeated deploys. Pre-game wait timers are not active-match state but still need explicit transfer/abort policy.                         |
| Tournament series, game result and attendance deadlines                               | PostgreSQL series/game rows, `room_id`, deadline queue and scheduler; room stores game/match IDs and seat holders                                                                                                 | Keep authoritative records in existing stores; update owner binding transactionally and idempotently                                   | A game stays the same tournament game and participant assignment. Deadline clock compensation is a series policy applied once per transfer. Result/outbox writes must use stable game/result IDs and validate owner epoch. Do not call normal room disposal/result/forfeit paths for a successful handoff. |
| RNG and ID generators                                                                 | seeded setup stream; `Math.random` in security shuffle; bot RNG; room UUID; per-match `perm-N`/`inst-N`; `dec-N`/`mull-N`; room event/batch counters                                                              | Persist serializable PRNG state and ID high-water marks; replace unseeded runtime randomness with an injected source                   | Existing RNG closures hide their internal state. See [RNG, clock and ID inventory](#rng-clock-and-id-inventory). Tests/fuzzers may use separate nondeterministic generators; production game paths must be audited separately.                                                                             |
| Logs and presentation history                                                         | `matchLogId`, bounded presentation report window, emitted server events and room logs                                                                                                                             | Reconstruct minimal operational context; persist only explicitly retained diagnostics                                                  | Never put snapshots, hidden card identities, credentials, authorization tokens, or reusable room codes in ordinary logs. Presentation history is not needed to determine rules state; open scenes/prompts are represented by their frame descriptors.                                                      |

## Target snapshot contract

The durable snapshot is a versioned data document, not `GameState.toJSON()` plus object spreading.
The writer explicitly maps authoritative values into a schema and rejects unsupported live
continuations. A first shape is:

```ts
interface LiveGameSnapshotV1 {
  snapshotSchemaVersion: 1;
  executionVersion: string;
  rulesVersion: string;
  gameId: string; // stable logical identity
  source: { generationId: string; processId: string; roomId: string; ownerEpoch: number };
  transferId: string;
  stateVersion: number;
  lastEventSeq: number;
  lastBatchSeq: number;
  lastAppliedCommandSeq: [number, number];
  match: MatchSnapshot; // modes, seats, frozen decks, authoritative GameState data
  engine: EngineContinuation; // frames, ledgers, counters, RNG and ID generator state
  timers: TimerSnapshot[]; // stable timer kind + deadline/remaining time + pause policy
  checksum: string;
}
```

The types above are a design contract, not committed runtime types. Exact storage representation
(including JSONB and compression) remains subject to Stage 0 load measurements. `checksum` is
computed over a canonical serialization that preserves array order. Maps and sets use explicit
entry arrays with stable ordering; all references are stable IDs, never object identity.

Validation must check at least: schema/execution/rules compatibility; exactly two unique seats;
each physical card instance occurs in exactly one legal location; deck/security order and hidden
identities are preserved; permanent and instance IDs are unique; every frame, prompt, trigger,
effect source, timer and pending command points to an existing object; counters exceed all used
IDs; and the checksum matches. Derived projections are rebuilt and then compared against
invariants before activation.

Snapshots contain hidden information. They may be read or written only by trusted API processes
through the database role required for handoff. Do not send them to clients, include them in
HTTP error bodies, or log them. Credentials are stored separately, hashed where lookup is needed,
and never included in snapshots.

## Identity contract

Use three separate identities:

| Identity     | Lifetime                                                   | Meaning                                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gameId`     | Whole logical game, including all room/process generations | Stable authority key for snapshots, commands, results, and tournament game binding. Use the existing tournament game ID for tournament play; mint an opaque UUID for casual/ranked play. |
| `roomId`     | One Colyseus room instance                                 | Physical routing/discovery address. May change on handoff. Never use it alone as participant identity or replay identity.                                                                |
| `ownerEpoch` | Increments on every successful owner change                | Fencing token. Every mutating command, checkpoint, timer callback and external result write must validate it against the authoritative owner row.                                        |

Each seat is bound to an authenticated stable `accountId` or tournament `participantId`; guest
rooms need an unforgeable participant credential. `sessionId` is transport-local and can change
on reconnect. A reconnect credential resolves `(gameId, participant identity, seat)` and is
rotated/revoked according to the authentication system. It must not grant the other seat's view.

For tournaments, `tournamentGameId` remains the same across physical room replacement. Existing
`tournament_games.room_id` and legacy `tournament_matches.room_id` currently bind/authorize a
specific room; Stage 3+ must replace that single-room assumption with a conditional owner binding
that records physical route plus `ownerEpoch`, preserving authorization replay safety.

## Command and acknowledgement contract

An intent becomes a durable command envelope before the server acknowledges admission:

```ts
interface GameCommandV1 {
  gameId: string;
  commandId: string; // client-generated UUID; stable across retries
  participantId: string;
  seat: 0 | 1;
  seatSequence: number; // strictly increasing for this participant/game
  ownerEpoch: number;
  expectedStateVersion?: number; // optimistic concurrency hint, where meaningful
  intent: Intent;
}
```

The server records a command ID and its admission outcome durably before claiming it as received.
It distinguishes `received` (durably admitted) from `applied` (rules mutation and resulting
checkpoint/outbox are committed) and `rejected` (stable rejection result, no mutation). Repeated
`commandId` returns the known outcome; same ID with different payload is rejected as a protocol
error. Per-seat order is enforced by `seatSequence`. A gap or stale `ownerEpoch` is not silently
reordered or applied.

No network can guarantee delivery exactly once. The required guarantee is one durable effect per
`commandId`: the rules mutation, applied sequence, and pending external writes commit together, and
external effects (ranked result, tournament result, penalty, next-game allocation) use an outbox
with an idempotency key derived from stable game/command identity. `respondDecision` also includes
its stable decision ID; retries after migration return the original result without resolving the
decision twice.

Current `Intent` has no command ID, sequence, or epoch. It is sent by message type, reassembled in
`AegisRoom.handleIntent`, and immediately passed to `GameEngine.applyIntent`; the room logs and
returns an `IntentResult` but does not durably record admission. This is a hard prerequisite, not
an optional optimization.

## Transfer contract and invariants

Transfer status is durable and idempotent: `preparing -> frozen -> snapshot_saved ->
destination_validated -> owner_switched -> destination_active -> completed`, or an abort before
`owner_switched`. Every transition is conditional on `transferId`, source/destination identity,
snapshot checksum and expected `ownerEpoch`.

1. Build, warmup and compatibility checks happen while the source accepts play. Unsupported
   continuation types reject the transfer before the room freezes.
2. Freeze closes command admission at one ordered barrier. Commands before the barrier are applied
   or durably admitted with explicit progress; commands after it receive a retryable migration
   response and are not acknowledged as applied.
3. The source remains frozen and retains its state until the final snapshot is durable and the
   destination has validated it in an inert state.
4. A single database compare-and-swap changes `ownerEpoch` and owner route. Only the winner of
   that transaction may activate timers, bots, socket delivery, commands or external effects.
5. Every mutation and side effect checks the epoch at its commit boundary. A stale process may
   finish computation but must not commit state, emit a confirmation, or publish a result.
6. The new owner reconstructs the same open choice/attack/effect continuation, sends a fresh
   seat-filtered state and all still-pending prompt details, and only then admits the next command.
7. Hidden cards stay hidden in every seat-specific projection, notification, log and error path.
   A checksum validates integrity; it does not authorize disclosure.
8. Timer time spent in the handoff pause is excluded according to the timer's own policy. Repeated
   transfers cannot reset a pre-existing absence or grant extra decision time.
9. Tournament game/series identity, participant seats, frozen decks, official result and deadline
   policy stay unchanged. Applying a result or clock compensation twice is prevented by durable
   idempotency keys.
10. Before owner switch, abort invalidates the prepared destination and resumes the same source
    from its barrier. After owner switch, rollback is a new transfer from the current owner; the
    stale source snapshot is never reactivated.
11. A release that cannot import a snapshot version reports a concrete incompatibility and leaves
    the source authoritative. It must not guess at old frame semantics or force a room to end.
12. A completed transfer must not use ordinary `onLeave`, `onDispose`, surrender, timeout, result,
    or tournament-room-release paths; those represent player/game events, not ownership movement.

The transfer's success point is a durable owner change plus a validated, recoverable snapshot and
an active destination. Waiting for both browsers to return is not required; an offline player
resolves `gameId` to the current owner when they reconnect.

## Execution suspension inventory

The explicit client-input suspension seams found in the current engine are:

- `DecisionManager.request()` in `engine/decisions/index.ts`, reached through `EffectContext.ask`,
  resolver ordering, cost/evolution choices, and timing/replacement flows;
- `MulliganCoordinator.request()` in `engine/mulligan.ts`, sequenced from
  `gameEngine/matchLifecycle.ts`;
- `MainPhaseController.run()` and `BreedingPhaseController.run()`, awaited by
  `TurnStateMachine` while they accept later intents;
- combat prompt promises in `CombatController` for Block, Counter, Alliance, Evade and Barrier.

They are not the only async edges. Card execution awaits nested timing windows, rule checks,
deferred/sub-trigger queues, continuous recomputation and combat resolution. A snapshot is legal
only after those flows reach a registered stable suspension point or after they finish. A global
“no pending decision” check is insufficient: the engine can be waiting on a phase controller,
combat prompt, timer, bot callback, or nested effect that is not represented by
`GameState.pendingDecision`.

## RNG, clock and ID inventory

| Source                                | Current behavior                                                                                                                                                                 | Handoff requirement                                                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Match setup / deck shuffle / mulligan | `AegisRoom.onCreate` chooses a 32-bit seed; `setup.ts` derives per-seat Mulberry32 streams and stores closure-valued `rngForSeat`.                                               | Store each PRNG algorithm/version and current 32-bit state, not only the original seed. A seed alone cannot recover how many random draws have already occurred.                    |
| First-player choice                   | Derived from the setup seed in `matchLifecycle.ts`.                                                                                                                              | Once chosen, persist the `turnSeat` and setup progress. Keep seed only if required for remaining deterministic streams.                                                             |
| Security shuffle                      | `engine/effects/verbs/securityStack.ts` calls `Math.random()` directly.                                                                                                          | Route through a versioned per-game RNG and serialize its state before deterministic transfer/recovery is claimed. This is currently nondeterministic in production rules execution. |
| Bot policy/timing                     | `BotPlayer` has a seeded private Mulberry32 closure; its evaluation policy also receives a seed. The constructor defaults its seed to a constant unless the room passes options. | Record profile/policy version, seed, RNG states and action progress, or explicitly define a deterministic policy restart boundary. Avoid running old and new drivers concurrently.  |
| Fuzzer and test helpers               | `Math.random()` appears in fuzzer/test-deck generation and test fixtures.                                                                                                        | Keep distinct from production game RNG; inject/report test seeds for reproducible cases. Do not mistake test-only sources for server behavior.                                      |
| Card and permanent IDs                | Initial physical card IDs are `s{seat}-{ordinal}`; engine token/instance and permanent counters mint `inst-N` and `perm-N`.                                                      | Persist high-water counters, preserve every existing physical ID, ensure next generated ID is unused.                                                                               |
| Decision/mulligan IDs                 | Local manager counters mint `dec-N` and `mull-N`.                                                                                                                                | Persist stable IDs and next counters with their pending frame; never reuse a still-observable decision ID.                                                                          |
| Events/batches                        | `AegisRoom` counters start at 0 per physical room and mint `batch-N` plus monotonic `seq`.                                                                                       | Persist high-water marks under logical game identity; use a transfer namespace if the client protocol cannot continue the same sequence safely.                                     |
| Logical/operational IDs               | Room transport ID from Colyseus; `matchLogId` from `randomUUID`; tournament IDs from PostgreSQL-backed stores.                                                                   | Add stable `gameId`; keep log correlation separate. Tournament IDs remain authoritative. Do not derive durable identity from display names or process IDs.                          |
| Wall-clock timestamps                 | `Date.now()` is used for result timestamps and presentation reporting; tournament services generally accept an injected `now`.                                                   | Distinguish wall clock from elapsed-duration timers. Capture absolute deadlines and paused remainder according to timer policy; inject a clock for game timers.                     |
| Room timers                           | Colyseus clock drives lobby, ready and combat window timers; `DecisionManager` uses global `setTimeout`; reconnect uses in-memory `allowReconnection`.                           | Persist timer kind, start/deadline, remaining duration, policy and whether it was already paused. Recreate only after owner activation; handoff downtime does not count.            |
| Tournament scheduler                  | Durable `DeadlineQueue`; scheduler accepts a clock value and leases rows.                                                                                                        | Preserve its existing durable clock and idempotency semantics. Handoff compensation must be an explicit one-time series operation, not a local timer adjustment.                    |

`AegisRoom` currently includes the setup seed in its `room.created` debug record. The handoff
storage/logging work must review that field: the seed controls hidden deck order and is not public
state. Keep it out of ordinary logs and client-visible paths unless a threat review explicitly
allows it.

## Reproducible hard cases and Stage 0 baseline

The following cases must become fixtures before broad transfer activation:

1. An optional/target-selection decision in an effect, including a hidden hand or security
   candidate set, answered after handoff.
2. An `orderTriggers` decision with multiple nested trigger pools and a one-shot continuous or
   delayed watcher; prove no trigger is lost or fired twice.
3. A security check paused after `securityRevealed`, with its private identity and subsequent
   security/attack ordering preserved.
4. A Block or Counter prompt during an attack, plus Alliance/Evade/Barrier in nested combat; answer
   on destination and prove the attack completes once.
5. A Main action accepted while asynchronous effects settle, and a Breeding action whose triggers
   have not settled at freeze time.
6. Mulligan after at least one prior shuffle and a game whose later effect shuffles security;
   compare the next draws and private zones against an uninterrupted control run.
7. A bot turn paused during think delay or a decision, and a bot-vs-bot tournament game with no
   connected client.
8. A tournament transfer near an attendance/game/series deadline, followed by a duplicate
   transfer request and a repeated result/outbox delivery.
9. A player already offline before deployment; verify the migration neither forfeits nor resets
   their existing grace/deadline.
10. Source process death before final snapshot, after final snapshot but before owner CAS, and after
    owner CAS but before destination activation.

### Local schema-codec baseline

`apps/api/src/rooms/handoff/baseline.test.ts` contains an opt-in measurement harness for the
existing stopped-Main-boundary Colyseus schema codec. It is disabled unless the test process has
both `AEGIS_ROOM_HANDOFF_EXPERIMENT=1` and `AEGIS_ROOM_HANDOFF_BASELINE=1`; it also refuses
`NODE_ENV=production`. Run it with:

```bash
AEGIS_ROOM_HANDOFF_EXPERIMENT=1 AEGIS_ROOM_HANDOFF_BASELINE=1 \
  pnpm --filter @aegis/api exec vitest run src/rooms/handoff/baseline.test.ts
```

One opt-in run on 2026-09-20 (Node v24.21.0, Darwin 25.6.0 arm64) used 25 fresh deterministic
two-seat fixtures with 180 physical card instances each. A full server-private schema payload was
36,216 bytes; its JSON envelope was 70,195 bytes. Export median/p95 was 0.544/0.755 ms and import
median/p95 was 2.814/7.510 ms. The 25 export/import pairs used 129.779 ms user CPU and 12.123 ms
system CPU. Process heap/RSS samples for one source/export/destination pair were respectively
108,926,416 / 293,470,208 bytes before, 109,299,752 / 293,814,272 after export, and
100,647,272 / 309,821,440 after import. The round trip matched the source schema.

The report prints only fixture label, counts, timings, memory counters, sizes and a boolean; it
never prints or returns the snapshot or card identities. The process memory readings are noisy
whole-process samples and may move backward when garbage collection runs; they are not peak
allocation or per-room heap guarantees. This is only the schema portion of the stopped-boundary
experiment, not a complete engine checkpoint or a two-process import measurement. Production-like
active-room/player distributions, real engine continuation sizes, concurrent transfer CPU/memory,
and measured end-to-end transfer pauses remain pre-activation gates. Proposed p95/p99 pause goals
are still unmeasured.
