# Raid lifecycle

## Status

This bounded owner lane proves the public tie-selection branch for the compiled BT24-011 provider. Existing provider suites supply the public refusal and single highest-DP anchors; this file adds the missing equal-highest choice evidence.

## Obligation ledger

| Obligation                                                                                                         | Evidence                                                                                                                                                                  | Status                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Raid triggers from a Digimon attack and may switch a player attack to an opponent's highest-DP unsuspended Digimon | `keyword-raid-consent.test.ts` uses a public attack and resolves the selected target to trash while preserving the attacker and security                                  | Proven                        |
| Raid processing is optional and can be refused                                                                     | `apps/api/src/cards/BT24/BT24-011.test.ts` public `selectCards` response with `instanceIds: []` preserves the battle-area target and performs the original security check | Reused existing public anchor |
| Multiple equal highest-DP unsuspended targets require the attacking player to choose one                           | `keyword-raid-consent.test.ts` asserts both exact candidate instance IDs, chooses `secondHigh`, and verifies only that instance is trashed                                | Proven                        |
| Raid has no eligible redirect when all possible targets are suspended                                              | Existing `apps/api/src/cards/BT24/BT24-011.test.ts` public coverage exercises the no-eligible-target branch; this owner lane does not duplicate it                        | Reused existing public anchor |
| Printed and inherited provider forms                                                                               | Current providers include printed AD1/BT24/EX13 forms and inherited BT24-010/BT24-011 forms; this lane uses BT24-011 and does not claim all provider shapes complete      | Bounded inventory             |

## Source and gates

The test cites `comprehensive-0242` with SHA-256 `3fc3398eb955b3c6e0d902b4e6a8719d1b767d125d2df06f233802288c3f6b12`, covering §16-23-1 through §16-23-4. `pnpm --filter @aegis/api exec vitest run src/cards/BT24/BT24-011.test.ts src/engine/conformance/keyword-raid-consent.test.ts` passed (10 tests across 2 files). Oxfmt, focused Oxlint, and scoped `git diff --check` passed.

## Open scope

This does not certify every Raid printer, granted/source-loss lifecycle, or unrelated attack interactions. The existing BT24-011 refusal anchor and this tie-choice proof cover the requested consent and target-selection obligations.
