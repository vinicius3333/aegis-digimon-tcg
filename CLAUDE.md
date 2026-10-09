# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The rules in `AGENTS.md` above apply in full. This file adds commands and the architecture map.

## Commands

Requires Node 26 and pnpm 10. Run commands from the repository root.

| Task                                               | Command                 |
| -------------------------------------------------- | ----------------------- |
| Run shared (watch), API on `:2567`, web on `:5173` | `pnpm dev`              |
| Build everything                                   | `pnpm build`            |
| Type-check all packages (also the `pre-push` hook) | `pnpm typecheck`        |
| Lint and format check (Oxlint, Oxfmt)              | `pnpm check:style`      |
| Full CI suite                                      | `pnpm ci`               |
| Repository tool tests                              | `pnpm test:tools`       |
| Simulator verification gate                        | `pnpm verify:simulator` |

### API tests (`apps/api`)

| Task                                                                   | Command                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| One file                                                               | `pnpm --filter @aegis/api exec vitest run src/engine/scenarios/<file>.test.ts` |
| One test by name                                                       | add `-t "<name>"` to the command above                                         |
| Fast inner loop (skips cards, conformance, fuzzer, `mechanic.test.ts`) | `pnpm --filter @aegis/api test:fast`                                           |
| Engine only                                                            | `pnpm --filter @aegis/api test:engine`                                         |
| Cards only                                                             | `pnpm --filter @aegis/api test:cards`                                          |
| Conformance                                                            | `pnpm --filter @aegis/api test:conformance`                                    |
| Postgres atomicity lane (needs `POSTGRES_TEST_URL`)                    | `pnpm --filter @aegis/api test:postgres`                                       |

Build `@aegis/shared` first when a focused test depends on changed shared code. `pnpm --filter @aegis/api test` does this for you.

### Web tests (`apps/web`)

- Unit: `pnpm --filter @aegis/web exec vitest run <path>`
- Browser (Playwright): see "Tests" in `AGENTS.md`.

## Architecture

Three workspaces. Dependencies point inward: both apps depend on `@aegis/shared`, and neither app depends on the other.

| Package           | Owns                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | Card catalog (`src/cards/data/cards.json`), Colyseus schema, protocol types, ban list, card IR types (`src/effects/ir/`), generated `src/effects/effects.json` |
| `apps/api`        | Colyseus rooms (`src/rooms/`), rules engine (`src/engine/`), card modules (`src/cards/<SET>/`), bots, tournaments, Postgres persistence                        |
| `apps/web`        | React client, PixiJS board, deck builder, lobby                                                                                                                |

### Turn flow

1. A client joins an `AegisRoom` and gets a seat-filtered state view.
2. The client sends an intent. `intentRouter.ts` routes it to `GameEngine`.
3. `GameEngine` validates actor, phase, cost, and targets. `TurnStateMachine` and the phase controllers drive the turn.
4. Actions move cards through the state-access layer and push effects onto the effect stack.
5. A decision pauses resolution until its owner answers.
6. Each event carries `seq`, `batch`, and `stateVersion`. The room ends each batch with `batchClosed`. The client paces its own animation from this stream. It draws the board from the batch snapshot and reads live state for legality.

### Cards and effects

- Each card is one module at `apps/api/src/cards/<SET>/<CARD-ID>.ts`. `apps/api/src/cards/index.ts` imports them all at boot.
- Every card is a declarative `CompiledCard` registered with `registerIrCard` (`apps/api/src/engine/effects/interpreter/registration/module.ts`). The interpreter in `engine/effects/interpreter/` runs it. `registerCard` with a hand-written `EffectModule` is legacy.
- `effects.json` is a generated snapshot. Edit the card module, then run the sync command from `AGENTS.md`.
- Continuous effects are recomputed from active sources (`engine/effects/continuous.ts`). They are never stored as permanent mutations.

### Trigger resolution

One game event produces one pool of triggers. A single loop resolves the pool:

1. **Collect** printed triggers and armed SubTrigger watchers. The loop rebuilds the pool on every pass, so a trigger whose condition lapses drops out.
2. **Order**: turn player first. Each controller picks the next trigger from their own group.
3. **Resolve one**, then run the rule sweep and drain the deferred queues. A trigger derived from the effect that just resolved activates before older pending triggers.

`docs/ARCHITECTURE.md` explains the SubTrigger consumption identity and the multi-process (Redis) setup.

### Persistence and processes

- Migrations in `apps/api/src/db/migrations` are sequential and run at startup.
- A room and its engine live in one process. Match state is not durable.
- With `AEGIS_REDIS_URL` and `AEGIS_PROCESS_PATH` unset, the API runs as one process. `pnpm dev` runs it this way.

## Releasing

See the "Releasing" section of `README.md`. Release text needs English, Portuguese (`pt-BR`), and Spanish (`es`) entries in `apps/web/src/releases/`.
