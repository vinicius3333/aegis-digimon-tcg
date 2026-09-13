# Training lifecycle

## Obligation ledger

| Obligation | Evidence | Status |
| --- | --- | --- |
| Suspend during the controller's main phase, then place the deck top face-down under the Training Digimon | `apps/api/src/engine/conformance/keyword-training-boundaries.test.ts` exact deck instance IDs, face-down state, stack order, suspend state, empty pending-decision state; `comprehensive-0260` SHA-256 `b7603283456371a6ab6f29c64ef1a78e2afe6094bf01b1706c0f3fa73f927cf7` | Proven |
| Training activation is available during a natural controller main phase | Same test uses `startTurnLoop` and `waitForMainPhase(0)` before applying the public effect intent | Proven |
| Empty deck cannot complete the mandatory placement | Same test obtains a real Training effect key from a populated control, submits it to an empty-deck public engine, and asserts rejection with no mutation | Proven |

## Status and gates

- Focused proof is bounded to EX9-008's public compiled Training activation.
- Exact physical instance identities, face-down placement, stack order, suspend state, deck count, and pending-decision cleanup are asserted.
- Source contract is `comprehensive-0260` (`b7603283456371a6ab6f29c64ef1a78e2afe6094bf01b1706c0f3fa73f927cf7`); the cited implementation provider is compiled EX9-008, with the public `activateEffect` intent and natural `startTurnLoop` main-phase gate.
- Focused command: `apps/api/node_modules/.bin/vitest run apps/api/src/engine/conformance/keyword-training-boundaries.test.ts` — 1 file, 2 tests passed. `node_modules/.bin/oxlint apps/api/src/engine/conformance/keyword-training-boundaries.test.ts` and `pnpm exec oxfmt --check apps/api/src/engine/conformance/keyword-training-boundaries.test.ts` pass; `git diff --check` passes.
- No copied, granted, source-loss, repeat/once-per-turn, or broader provider inventory is claimed complete.

## Open classes

Copied and granted Training sources, additional providers, and any broader once-per-turn/provider inventory remain outside this proof.
