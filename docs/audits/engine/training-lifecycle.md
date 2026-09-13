# Training lifecycle

## Obligation ledger

| Obligation                                                                                                           | Evidence                                                                                                                                                                                                                                                                  | Status |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Suspend during the controller's main phase, then place the deck top face-down under the Training Digimon             | `apps/api/src/engine/conformance/keyword-training-boundaries.test.ts` exact deck instance IDs, face-down state, stack order, suspend state, empty pending-decision state; `comprehensive-0260` SHA-256 `b7603283456371a6ab6f29c64ef1a78e2afe6094bf01b1706c0f3fa73f927cf7` | Proven |
| Training activation is available during a natural controller main phase                                              | Same test uses `startTurnLoop` and `waitForMainPhase(0)` before applying the public effect intent                                                                                                                                                                         | Proven |
| Empty deck cannot complete the mandatory placement                                                                   | Same test obtains a real Training effect key from a populated control, submits it to an empty-deck public engine, and asserts rejection with no mutation                                                                                                                  | Proven |
| A suspended source is ineligible, and a non-controller cannot activate the source                                    | Same test checks the public activatable-effects view, submits the real effect key against a suspended source, then submits it from seat 1; both are rejected and the source/deck remain unchanged                                                                         | Proven |
| Training can be repeated after a natural turn boundary when the source is unsuspended and the deck remains available | Same test uses `startTurnLoop`, public `endPhase` for both seats, observes the next seat-0 Main phase, and verifies a second exact deck instance is placed face-down at stack index 0                                                                                     | Proven |

## Status and gates

- Focused proof is bounded to EX9-008's public compiled Training activation and its natural eligibility/repeat boundaries.
- Exact physical instance identities, face-down placement, stack order, suspend state, deck count, and pending-decision cleanup are asserted.
- Source contract is `comprehensive-0260` (`b7603283456371a6ab6f29c64ef1a78e2afe6094bf01b1706c0f3fa73f927cf7`); the cited implementation provider is compiled EX9-008, with the public `activateEffect` intent and natural `startTurnLoop` main-phase gate.
- Focused command: `apps/api/node_modules/.bin/vitest run apps/api/src/engine/conformance/keyword-training-boundaries.test.ts` — 1 file, 4 tests passed. Oxfmt, focused Oxlint, and `git diff --check` are the required follow-up gates for this change.
- Current printed/runtime provider inventory includes EX9-008/009/010/015/016/017/022/025/026/029/034/037/038/039/051/059/060/061, BT26-023/040, and P-202; this lane proves EX9-008 only. Copied, granted, source-loss, and broader provider proof remain open.

## Open classes

Copied and granted Training sources, additional providers, and any broader provider inventory remain outside this proof. The source contract itself has no once-per-turn clause; the repeat case therefore covers the generic repeat boundary for EX9-008, without certifying other providers.
