# Loose-card distinct-color selection

## Contract and root cause

An ordinary effect selecting two cards with different colors must select the largest legal subset when only one different-color assignment is possible. [Comprehensive Rules 1-3-2 and 15-10-2-1](https://world.digimoncard.com/rule/pdf/general_rule.pdf) require as much of ordinary processing as possible; 4-25-2 allows a multicolor card to contribute one differing component. These rules do not permit partially paying an exact-count cost.

At base `805400f2c45d9bb40983dde9691be06b605bec30`, `pickLoose` computed its minimum from the number of physical candidates before applying the different-colors constraint. Two red cards produced minimum two, although only one could legally be selected. Its final minimum guard consequently suppressed the entire ordinary Trash action.

## Reproduction and implementation

`pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts -t 'rejects a second pick that cannot claim any unused color' --maxWorkers=1 --no-file-parallelism` reproduced the failure from pristine `git archive 805400f2c`: the Trash recorder returned undefined instead of the first red instance. The first collection gate also reproduced it, with 3,146 other tests passing.

The serialized Luna engine lane calculates the maximum feasible distinct-color subset before opening the decision, uses that capacity for the mandatory minimum, and preserves rejection of responses below the actual legal minimum. The existing maximum-matching helper distinguishes two multicolor copies from two monochromatic copies. Optional up-to selection remains supported.

## Behavioral proof and gates

Existing interpreter cases prove two overlapping multicolor cards and two identical two-color cards can both be chosen, while a pair of red-only cards can contribute only one. New cases distinguish optional partial selection from a forged under-minimum mandatory selection when two legally distinct cards are available. A new direct `payCost` regression requires two different-color trash cards from two red-only candidates: payment fails, the receipt remains zero, and no card is trashed.

The serialized focused round on 2026-09-13 passed interpreter, capabilities, EX7-037, AD1-023, BT18-096 and EX13-077 together with the seven EX8 reset suites (13 files green). The only two failures in that 15-file run were EX8-031/032 new turn fixtures, outside this mechanism; those are being corrected. Final combined gate passed 272 files and 3,183 tests, including all EX8 card proofs, conformance, combat, effects, engine cards and the four explicit matching consumers. Independent Luna review found no critical or important issue. Delivery is recorded in the EX8 ledger.
