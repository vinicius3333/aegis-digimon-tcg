# Aegis architecture

Aegis is a server-authoritative Digimon Card Game simulator. The API owns game
state and rules; the web client renders synchronized state and sends typed
intents.

## Workspace

- `packages/shared`: card data, schema classes, enums, protocol types, and
  runtime effect records shared by server and client.
- `apps/api`: Colyseus rooms, rules engine, persistence, tournaments, bots, and
  TypeScript card modules.
- `apps/web`: React application and game presentation.
- `data/kb`: official rules, rulings, errata, and banlist data.
- `tools`: current card-data, knowledge-base, release, and deployment utilities.

Dependencies point inward through `@aegis/shared`: the shared package does not
depend on either application, and the web application does not own game rules.

## Runtime flow

1. A client joins an `AegisRoom` and receives a seat-specific state view.
2. The client sends an intent describing the requested action.
3. `GameEngine` validates the intent against the authoritative state.
4. Engine actions update zones through the state-access layer and resolve
   effects through the effect stack.
5. Decisions pause effect resolution until the owning player responds.
6. Colyseus synchronizes the resulting state and the server emits presentation
   events where appropriate.

The client never sends state replacements or decides whether an action is
legal.

## Cards and effects

Every supported card has a module under `apps/api/src/cards/<SET>/<ID>.ts`.
Importing `apps/api/src/cards/index.ts` registers those modules at boot.

Cards use one of two runtime representations:

- a hand-written `EffectModule` composed from builders and effect primitives;
- a declarative `CompiledCard` object embedded directly in its TypeScript
  module and interpreted by the shared runtime.

Both representations are maintained directly in the card module. Card modules
are the authoring source; there is no separate generator that creates their
behavior.

The committed `packages/shared/src/effects/effects.json` remains runtime data
for shared card requirements and client/server lookups. It is a generated
runtime snapshot, not an authoring source. Use `pnpm effects:sync:set -- --set
<SET> --base <GIT-REF>` to synchronize one set from its authoritative modules,
restore byte formatting outside that set, and reject out-of-scope semantic
changes. Use
`pnpm effects:check:set -- --set <SET> --base <GIT-REF>` to verify catalog-key
parity, idempotence, and semantic/byte scope.

## State and effects

`GameState` contains the turn cursor, memory gauge, players, public game status,
and pending interaction state. Each `PlayerState` owns its zones. A `Permanent`
contains a top card, digivolution stack, linked cards, controller, DP, and
position flags.

The effect stack collects effects for a timing window, orders simultaneous
effects, resolves them one at a time, and opens typed decisions when player
input is required. Continuous effects are recomputed from active sources rather
than stored as permanent mutations.

### Trigger sequencing

One game event produces one pool of triggers, resolved by a single loop:

1. **Collect.** The pool holds the printed effects that trigger at the window's
   timing plus the armed SubTrigger watchers for the same event, which the event
   seam hands over through `withPendingSubTriggers`. Watchers are snapshotted
   when the event happens; the pool is re-derived every pass, so a trigger whose
   condition lapses drops out (CR §15-4-4-5).
2. **Order.** Turn player's triggers first, then the opponent's. Within one
   controller's group the controller chooses the next one to resolve — printed
   effects and watchers compete in the same prompt.
3. **Resolve one**, then run the rule sweep (state-based actions) and settle the
   deferred queues. A trigger derived from the effect that just resolved
   therefore activates before the triggers that were already pending
   (CR §15-4-5-2/3).

Step 3 is why a window never parks a deferred deletion or security-removal
reaction until it closes: it drains them between effects, at the only point
where no card body is on the stack. A nested (cut-in) resolution opened from
inside a card body neither settles those queues nor reaches into the pool.

Whatever the windows did not resolve fires afterwards on the SubTrigger bus,
which skips the watchers the window already consumed. Consumption is tracked by
a stable `(event, anchor, description)` identity, because a continuous recompute
re-installs every continuous watcher under a fresh subscription id.

## Persistence

Database schema upgrades live in `apps/api/src/db/migrations`; they are active
runtime migrations and must remain sequential.

## Processes

A Colyseus process is single-threaded, so one process uses one CPU core no matter how
many the host has. The API therefore runs as several processes that share their
matchmaking state, and each one advertises the public path where clients reach it.

| Variable                                  | Meaning                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `AEGIS_REDIS_URL`                         | Shared matchmaking state. Unset means single-process: local presence, local driver, no public address.                                       |
| `AEGIS_PROCESS_PATH`                      | This process's unique path segment (`p1`, `p2`, …). Required whenever `AEGIS_REDIS_URL` is set.                                              |
| `AEGIS_PUBLIC_HOST`                       | Host clients connect to; falls back to `AEGIS_API_URL`. Combined with the path into the address Colyseus returns with each seat reservation. |
| `AEGIS_LOG_MAX_BYTES` / `AEGIS_LOG_FILES` | Size and generation count for the rotating `apps/api/logs/api.log`.                                                                          |

Two consequences follow from rooms living on one process each:

- The edge proxy must route each `/pN` path to that process and nowhere else. A seat
  reservation is worthless on a sibling. `docker/Caddyfile` does this.
- State the HTTP endpoints read cannot be process-local. Private room codes live in the
  shared presence, `/bot/join` reaches the owning process through `remoteRoomCall`, and a
  drain is published to every process of the slot.

Each slot runs its own Redis, which is what keeps a draining slot and the active one from
seeing each other's rooms: Colyseus's own matchmaking keys are fixed names, so a shared Redis
would merge the two slots' room listings. `AEGIS_REDIS_URL` therefore points at the slot's own
instance, and the slot-scoped prefix applies only to the keys Aegis writes itself.

## Verification

```bash
pnpm typecheck
pnpm test:tools
pnpm test
```

Card behavior tests assert observable state changes. Engine conformance tests
cover shared rules, and web scenarios exercise rendered flows through a real
room.
