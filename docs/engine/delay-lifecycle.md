# Delay lifecycle

## Status

This bounded owner lane adds a natural public entry-turn restriction and next-owner-turn activation proof for P-036 Blue Memory Boost!. Existing P-036 and BT10-097 suites provide additional public payload and source-cost anchors.

## Obligation ledger

| Obligation                                                                 | Evidence                                                                                                                                                  | Status                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| A card with Delay cannot activate it on the turn it enters the battle area | `keyword-delay-boundaries.test.ts` publicly plays P-036 and observes no Delay activation entry before the first end phase                                 | Proven                  |
| Delay activation trashes the source card and resolves its optional payload | Same test activates the real P-036 Delay entry on a later public Main phase, then asserts the exact source instance is in trash and memory increased by 2 | Proven                  |
| Delay becomes available on a later owner turn                              | Same test uses `startTurnLoop`, public end-phase intents for both seats, and the next natural seat-0 Main phase                                           | Proven                  |
| Optional refusal and payload-specific provider shapes                      | Existing P-036 tests cover the optional later Delay payload and refusal; EX10-069/P-105 suites cover distinct delayed digivolution forms                  | Reused existing anchors |

## Source and gates

The owner test cites `comprehensive-0235` with SHA-256 `866991fdeb6c896a2840c30399a87d353e8cbd33d30f706e6729ba46bd4428d2`, covering §16-17-1 through §16-17-3. `pnpm --filter @aegis/api exec vitest run src/cards/P/P-036.test.ts src/engine/conformance/keyword-delay-boundaries.test.ts` passed (5 tests across 2 files). Focused Oxlint, Oxfmt, and scoped `git diff --check` also passed.

## Open scope

This proof does not certify every printed, granted, inherited, Security, Counter, or Assembly Delay provider, nor source-loss behavior for pending delayed effects. Those provider classes remain open until separately anchored by actual public tests.
