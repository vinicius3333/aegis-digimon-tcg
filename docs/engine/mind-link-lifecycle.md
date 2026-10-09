# Mind Link lifecycle

## Status

This bounded owner lane proves the public BT14-086 Mind Link target restriction and manual choice. The keyword is mandatory once activated, so “refusal” is represented by the no-eligible-target activation boundary rather than an optional decline.

## Obligation ledger

| Obligation                                                            | Evidence                                                                                                                                                     | Status                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Mind Link places its Tamer source under a Digimon with no Tamer cards | `keyword-mind-link-boundaries.test.ts` publicly plays and activates BT14-086, then asserts the exact source instance is under the selected Digimon           | Proven                              |
| A Digimon that already has a Tamer is excluded                        | Same public decision payload contains only the eligible target and excludes the occupied target’s exact instance                                             | Proven                              |
| Multiple eligible targets are resolved through a player decision      | The owner fixture uses manual `chooseTargets` response with two eligible permanent IDs and verifies the selected physical target and Tamer instance identity | Bounded choice proof                |
| Mind Link processing is mandatory after activation                    | `comprehensive-0247` §16-28-2/3 and existing BT14-086/BT14-087 public suites cover the mandatory placement path; no optional decline is claimed              | Source and existing-provider anchor |
| Printed/inherited/granted provider forms                              | Current BT14-086 and BT14-087 are printed providers with distinct target filters; this lane proves BT14-086. Inherited or granted forms remain unclaimed     | Open inventory                      |

## Source and gates

The test cites `comprehensive-0247` with SHA-256 `40b7489c5fee5659b483448f6a0f627602c208034e95125c3ec57a9985121078`, covering §16-28-1 through §16-28-3. `pnpm --filter @aegis/api exec vitest run src/cards/BT14/BT14-086.test.ts src/engine/conformance/keyword-mind-link-boundaries.test.ts` passed (7 tests across 2 files). Focused Oxlint, Oxfmt, and scoped `git diff --check` also passed.

## Open scope

No end-of-turn return is attributed to Mind Link; BT14-086’s separate inherited End-of-All-Turns effect remains a distinct printed clause. No existing BT14-086 test proves an activation attempt with zero eligible targets; that boundary remains open. Source loss, granted/inherited Mind Link, and additional provider classes require separate public anchors.
